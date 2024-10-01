// tests/search/responses/error_handling.edge_cases.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runErrorHandlingEdgeCasesTests(context: ITestContext) {
    it("Should ignore empty parameter values", async () => {
        // First, create a patient to ensure we have at least one result
        const patient = await createTestPatient(context, {
            family: "EmptyParamTest",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=EmptyParamTest&emptyParam=&anotherEmptyParam=`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK when ignoring empty parameters",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.total! > 0,
            "Bundle should have results despite empty parameters",
        );

        // Check if the created patient is in the results
        const patientEntry = bundle.entry?.find((entry) =>
            entry.resource?.id === patient.id
        );
        assertExists(
            patientEntry,
            "Created patient should be in the search results",
        );

        // Check if the empty parameters are not in the self link
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertFalse(
            selfLink.url.includes("emptyParam"),
            "Self link should not include the empty parameter",
        );
        assertFalse(
            selfLink.url.includes("anotherEmptyParam"),
            "Self link should not include the another empty parameter",
        );
    });

    it("Should handle multiple error conditions in same request", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?birthdate=invalid-date&unknownParam=value&_id=non-existent-id`,
        });

        // The server might return a 400 Bad Request or a 200 OK with an empty bundle and warnings
        if (response.status === 400) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.length > 1,
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
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_include=non-existent-resource:parameter&_revinclude=another-non-existent:param`,
        });

        // The server might return a 400 Bad Request or a 200 OK with warnings
        if (response.status === 400) {
            const operationOutcome = response.jsonBody as OperationOutcome;
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

    it("Should handle a very large number of parameters", async () => {
        // Generate a URL with a large number of parameters
        const manyParams = Array.from(
            { length: 100 },
            (_, i) => `param${i}=value${i}`,
        ).join("&");
        const response = await fetchWrapper({
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
}
