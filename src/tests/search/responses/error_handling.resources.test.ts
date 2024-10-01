// tests/search/responses/error_handling.resources.test.ts

import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runErrorHandlingResourcesTests(context: ITestContext) {
    it("Should handle search for non-existent resource by id", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_id=non-existent-id`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for search with non-existent id",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");
    });

    it("Should handle search with non-existent patient identifier", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?patient.identifier=http://example.com/fhir/mrn|non-existent-mrn`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for search with non-existent patient identifier",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");
    });

    it("Should handle search with unknown code", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=loinc|unknown-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for search with unknown code",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");
    });

    it("Should handle search with out of scope date", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?onset=le1800`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for search with out of scope date",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");
    });

    it("Should handle search with illegal/unsupported modifier", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?onset:unsupported=1995`,
        });

        assertTrue(
            response.status >= 400 && response.status < 600,
            `Server should return 4xx or 5xx status code for illegal modifier (got ${response.status})`,
        );

        if (
            response.jsonBody &&
            (response.jsonBody as OperationOutcome).resourceType ===
                "OperationOutcome"
        ) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.severity === "error"
                ),
                "OperationOutcome should contain at least one error issue",
            );
        }
    });

    it("Should handle search with incorrectly formatted date", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?onset=23-May-2009`,
        });

        assertTrue(
            response.status >= 400 && response.status < 600,
            `Server should return 4xx or 5xx status code for incorrectly formatted date (got ${response.status})`,
        );

        if (
            response.jsonBody &&
            (response.jsonBody as OperationOutcome).resourceType ===
                "OperationOutcome"
        ) {
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.severity === "error"
                ),
                "OperationOutcome should contain at least one error issue",
            );
        }
    });

    it("Should handle search with unknown parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?unknownParameter=value`,
        });

        // The behavior here can vary depending on the server's configuration
        if (response.status === 200) {
            // If the server is configured to ignore unknown parameters
            const bundle = response.jsonBody as Bundle;
            assertTrue(
                bundle.total !== undefined,
                "Bundle should have a total property",
            );
        } else {
            // If the server is configured to return an error for unknown parameters
            assertTrue(
                response.status >= 400 && response.status < 600,
                `Server should return 4xx or 5xx status code for unknown parameter (got ${response.status})`,
            );

            if (
                response.jsonBody &&
                (response.jsonBody as OperationOutcome).resourceType ===
                    "OperationOutcome"
            ) {
                const operationOutcome = response.jsonBody as OperationOutcome;
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.severity === "error"
                    ),
                    "OperationOutcome should contain at least one error issue",
                );
            }
        }
    });
}
