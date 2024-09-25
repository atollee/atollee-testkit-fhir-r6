import {
    assertFalse as originalAssertFalse,
    AssertionError,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";

export function assertFalse(
    actual: unknown,
    msg?: string,
): void {
    try {
        createAssertion(
            "assertFalse",
            false,
            actual,
            () => originalAssertFalse(actual, msg),
            msg,
        );
    } catch (error) {
        throw new AssertionError(error.message);
    }
}
