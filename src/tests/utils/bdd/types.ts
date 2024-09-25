export interface HttpRequest {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: string;
}

export interface HttpResponse {
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: string;
}

export interface Assertion {
    type: string;
    expected?: unknown;
    actual?: unknown;
    message?: string;
    passed: boolean;
    line: number;
}

export interface TestSuite {
    name: string;
    error?: string | undefined;
    tests: (TestResult | { nestedSuite: TestSuite })[];
    duration?: number;
}

export interface TestStep {
    request?: HttpRequest;
    response?: HttpResponse;
    assertions: Assertion[];
    duration?: number;
}

export interface TestResult {
    name: string;
    steps: TestStep[];
    result: "pass" | "fail";
    error?: Error;
    sourceCode: string;
    lineOffset: number;
    duration?: number; // Add duration for each test
}

export interface TestRecorderState {
    testResults: TestSuite[];
    currentTest: TestResult | null;
    currentDescribe: TestSuite | undefined;
    currentStep: TestStep | null;
}
