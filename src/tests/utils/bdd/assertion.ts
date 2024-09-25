import { getTestRecorderState } from "./mod.ts";

export function createAssertion(
    type: string,
    expected: unknown,
    actual: unknown,
    originalAssertFn: (() => void) | undefined,
    message: string | undefined,
): void {
    const { currentTest, currentStep } = getTestRecorderState();
    if (!currentTest || !currentStep) {
        throw new Error("Assertion made outside of a test or step");
    }
    let passed = true;
    let error = undefined;
    if (originalAssertFn) {
        try {
            originalAssertFn();
            passed = true;
        } catch (e) {
            error = e;
            passed = false;
        }
    }
    const line = getAssertionLine();
    currentStep.assertions.push({
        type,
        expected,
        actual,
        passed,
        message: message || "(no message)",
        line,
    });
    if (error) {
        throw error;
    }
}

function getAssertionLine(): number {
    const stack = new Error().stack;
    if (!stack) return -1;

    const lines = stack.split("\n");
    const testLine = lines.find((line) => line.includes(".test.ts"));
    if (!testLine) return -1;

    const match = testLine.match(/:(\d+):/);
    return match ? parseInt(match[1], 10) : -1;
}
