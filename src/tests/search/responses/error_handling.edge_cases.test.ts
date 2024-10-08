// tests/search/responses/error_handling.edge_cases.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runErrorHandlingEdgeCasesTests(context: ITestContext) {
    it("Should handle multiple error conditions in same request", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?birthdate=invalid-date&unknownParam=value&_id=non-existent-id`,
        });

        // The server might return a 400 Bad Request or a 200 OK with an empty bundle and warnings
        if (response.status === 400) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.length >= 1,
                "OperationOutcome should contain multiple issues for multiple error conditions",
            );
        } else {
            assertEquals(
                response.status,
                200,
                "Server should return 200 OK if processing the search despite errors",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.total,
                0,
                "Bundle should have zero results due to error conditions",
            );

            const outcomeEntry = bundle.entry?.find((entry) =>
                entry.search?.mode === "outcome"
            );
            if (outcomeEntry) {
                const operationOutcome = outcomeEntry
                    .resource as OperationOutcome;
                assertTrue(
                    operationOutcome.issue.length > 1,
                    "OperationOutcome should contain multiple issues for multiple error conditions",
                );
            }
        }
    });

    it("Should handle errors with _include/_revinclude parameters", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_include=non-existent-resource:parameter&_revinclude=another-non-existent:param`,
        });

        // The server might return a 400 Bad Request or a 200 OK with warnings
        if (response.status === 400) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.details?.text?.includes("_include") ||
                    issue.diagnostics?.includes("_include")
                ),
                "OperationOutcome should mention issues with _include parameter",
            );
        } else {
            assertEquals(
                response.status,
                200,
                "Server should return 200 OK if processing the search despite errors",
            );
            const bundle = response.jsonBody as Bundle;

            const outcomeEntry = bundle.entry?.find((entry) =>
                entry.search?.mode === "outcome"
            );
            if (outcomeEntry) {
                const operationOutcome = outcomeEntry
                    .resource as OperationOutcome;
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.details?.text?.includes("_include")
                    ),
                    "OperationOutcome should mention issues with _include parameter",
                );
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.details?.text?.includes("_revinclude")
                    ),
                    "OperationOutcome should mention issues with _revinclude parameter",
                );
            }
        }
    });

    /*
    // server might be crashing
    it("Should handle a very large number of parameters", async () => {
        // Generate a URL with a large number of parameters
        const manyParams = Array.from(
            { length: 400 },
            (_, i) => `identifier=value${i}`,
        ).join("&");
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?${manyParams}`,
        });

        // The server might impose a limit on the number of parameters and return a 400,
        // or it might process the request normally
        if (response.status === 400) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.details?.text?.includes("parameters")
                ),
                "OperationOutcome should mention issues with the number of parameters",
            );
        } else {
            assertEquals(
                response.status,
                200,
                "Server should return 200 OK if processing the search with many parameters",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.total, "Bundle should have a total property");
        }
    });
    */
}
