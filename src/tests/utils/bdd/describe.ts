import {
    describe as originalDescribe,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { TestSuite } from "./types.ts";
import { getTestRecorderState, setCurrentDescribe } from "./mod.ts";

export function describe(name: string, fn: () => void | Promise<void>): void {
    originalDescribe(name, async () => {
        const suite: TestSuite = { name, tests: [] };
        const { testResults, currentDescribe } = getTestRecorderState();
        testResults.push(suite);
        const previousDescribe = currentDescribe;
        setCurrentDescribe(suite);
        const start = performance.now();
        try {
            await fn();
        } catch (error) {
            suite.error = error.toString();
        } finally {
            const end = performance.now();
            suite.duration = end - start;
            setCurrentDescribe(previousDescribe);
        }
    });
}
