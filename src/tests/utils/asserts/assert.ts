import { assert as originalAssert, AssertionError } from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function assert(expr: unknown, msg = ""): asserts expr {
    try {
        createAssertion(
            "assert",
            true,
            expr,
            () => originalAssert(expr, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
