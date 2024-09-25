import {
    AssertionError,
    assertStrictEquals as originalAssertStrictEquals,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function assertStrictEquals<T>(
    actual: unknown,
    expected: T,
    msg?: string,
): asserts actual is T {
    try {
        createAssertion(
            "assertStrictEquals",
            expected,
            actual,
            () => originalAssertStrictEquals(actual, expected, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
