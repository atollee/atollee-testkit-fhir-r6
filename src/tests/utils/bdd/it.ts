import { it as originalIt } from "https://deno.land/std@0.224.0/testing/bdd.ts";
import {
    getTestRecorderState,
    setCurrentStep,
    setCurrentTest,
    setTestDuration,
} from "./mod.ts";
import { extractSourceCode } from "./source.ts";

export function it(name: string, fn: () => void | Promise<void>): void {
    const { sourceCode, lineOffset } = extractSourceCode();

    const { currentDescribe: itDescribe } = getTestRecorderState();

    originalIt(name, async () => {
        const currentTest = setCurrentTest({
            name,
            steps: [],
            result: "pass",
            sourceCode,
            lineOffset,
        });

        if (currentTest === null) {
            throw new Error("Could not set current test");
        }
        itDescribe?.tests?.push(currentTest);
        const start = performance.now();
        try {
            await fn();
            currentTest.result = "pass";
        } catch (error) {
            currentTest.result = "fail";
            currentTest.error = error;
            throw error;
        } finally {
            const end = performance.now();
            setTestDuration(itDescribe, currentTest, end - start);
            setCurrentTest(null);
            setCurrentStep(null);
        }
    });
}
