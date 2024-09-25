import {
    assertExists as originalAssertExists,
    AssertionError,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function assertExists<T>(
    expr: T,
    msg = "",
): asserts expr is NonNullable<T> {
    try {
        createAssertion(
            "assertExists",
            "non-null",
            expr,
            () => originalAssertExists(expr, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
