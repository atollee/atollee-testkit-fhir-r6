import {
    describe as originalDescribe,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";
import {
    HttpRequest,
    HttpResponse,
    TestRecorderState,
    TestResult,
    TestStep,
    TestSuite,
} from "./types.ts";

const testRecorderState: TestRecorderState = {
    testResults: [],
    currentDescribe: undefined,
    currentStep: null,
    currentTest: null,
};

export const getTestRecorderState = () => testRecorderState;

export const setCurrentDescribe = (suite: TestSuite | undefined) => {
    testRecorderState.currentDescribe = suite;
};

export const setCurrentStep = (step: TestStep | null) => {
    testRecorderState.currentStep = step;
};

export const setCurrentTest = (test: TestResult | null) => {
    testRecorderState.currentTest = test;
    return testRecorderState.currentTest;
};

export function mainDescribe(name: string, fn: () => Promise<void>): void {
    originalDescribe(name, {
        fn: async () => {
            const start = performance.now();
            await fn();
            const end = performance.now();
            const duration = end - start;

            // Assuming the last item in testResults is our main describe
            /*
            if (testRecorderState.testResults.length > 0) {
                testRecorderState
                    .testResults[testRecorderState.testResults.length - 1]
                    .duration = duration;
            }*/
        },
        sanitizeOps: false,
        sanitizeResources: false,
    });
}

export function recordHttpInteraction(
    request: HttpRequest,
    response: HttpResponse,
): void {
    if (!testRecorderState.currentTest) {
        throw new Error("HTTP interaction recorded outside of a test");
    }
    const start = performance.now();
    testRecorderState.currentStep = { request, response, assertions: [] };
    const end = performance.now();
    testRecorderState.currentStep.duration = end - start;
    testRecorderState.currentTest.steps.push(testRecorderState.currentStep);
}

export function getTestResults(): TestSuite[] {
    return testRecorderState.testResults;
}

export function setTestDuration(
    suite: TestSuite | undefined,
    test: TestResult,
    duration: number,
): void {
    test.duration = duration;
    if (suite) {
        suite.duration = suite.tests.map((t) => (t as any).duration).reduce((
            a,
            b,
        ) => a + b);
    }
}
