import {
    AssertionError,
    assertNotEquals as originalAssertNotEquals,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";
import { extractErrorMessage } from "../error.ts";

export function assertNotEquals(
    actual: unknown,
    expected: unknown,
    msg?: string,
): void {
    try {
        createAssertion(
            "assertNotEquals",
            expected,
            actual,
            () => originalAssertNotEquals(actual, expected, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(extractErrorMessage(error));
    }
}
