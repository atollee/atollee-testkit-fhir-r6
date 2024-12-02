import {
    AssertionError,
    assertThrows as originalAssertThrows,
} from "@std/assert";
import { createAssertion } from "../bdd/assertion.ts";
import { extractErrorMessage } from "../error.ts";

export function assertThrows<E extends Error = Error>(
    fn: () => unknown,
    // deno-lint-ignore no-explicit-any
    ErrorClass: new (...args: any[]) => E,
    msgIncludes?: string,
    msg?: string,
): E {
    try {
        const error = originalAssertThrows(fn, ErrorClass, msgIncludes, msg);
        createAssertion(
            "assertThrows",
            { ErrorClass, msgIncludes },
            {
                thrownError: error,
            },
            undefined,
            msg,
        );
        return error;
    } catch (error) {
        throw new AssertionError(extractErrorMessage(error));
    }
}
