import {
    assertEquals as originalAssertEquals,
    AssertionError,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function assertEquals(
    actual: unknown,
    expected: unknown,
    msg?: string,
): void {
    try {
        createAssertion(
            "assertEquals",
            expected,
            actual,
            () => originalAssertEquals(actual, expected, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
