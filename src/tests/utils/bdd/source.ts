export function extractSourceCode(): {
    sourceCode: string;
    lineOffset: number;
} {
    const error = new Error();
    const stack = error.stack?.split("\n");
    if (!stack) {
        throw new Error("Unable to analyze stack trace");
    }

    const callerLineIndex = stack.findIndex((element) =>
        element.indexOf(".test.ts") !== -1
    );
    if (callerLineIndex === -1) {
        console.log(
            stack?.map((element, index) => `line ${index}: ${element}`).join(
                "\n",
            ),
        );
        return {
            sourceCode: "no caller line index found",
            lineOffset: -1,
        };
    }
    const callerLine = stack[callerLineIndex];
    const match = callerLine.match(/at .+\((.+):(\d+):\d+\)/);
    if (!match) {
        console.log("caller line", callerLine);
        return {
            sourceCode:
                "Unable to extract file path and line number from stack trace",
            lineOffset: -1,
        };
    }

    const [, filePath, lineNumber] = match;
    const lineOffset = parseInt(lineNumber, 10);

    const fileContent = Deno.readTextFileSync(
        filePath.substring("file://".length),
    );
    const lines = fileContent.split("\n");

    const startLine = lineOffset - 1;
    let endLine = startLine;
    let braceCount = 0;
    let found = false;

    for (let i = startLine; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes("it(") && !found) {
            found = true;
        }
        if (found) {
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            endLine = i;
            if (braceCount === 0) {
                break;
            }
        }
    }

    const sourceCode = lines.slice(startLine, endLine + 1).join("\n");
    return { sourceCode, lineOffset };
}
