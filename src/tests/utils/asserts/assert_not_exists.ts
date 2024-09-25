import { AssertionError } from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function originalAssertNotExists<T>(
    actual: T,
    msg?: string,
): asserts actual is NonNullable<T> {
    if (actual !== undefined && actual !== null) {
        const msgSuffix = msg ? `: ${msg}` : ".";
        msg =
            `Expected actual: "${actual}" to not be null or undefined${msgSuffix}`;
        throw new AssertionError(msg);
    }
}

export function assertNotExists<T>(
    actual: T,
    msg?: string,
): asserts actual is NonNullable<T> {
    try {
        createAssertion(
            "assertNotExists",
            "null",
            actual,
            () => originalAssertNotExists(actual, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
