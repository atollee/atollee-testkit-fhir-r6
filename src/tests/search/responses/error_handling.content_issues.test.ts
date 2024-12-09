// tests/search/responses/error_handling.content_issues.test.ts

import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runErrorHandlingContentIssuesTests(context: ITestContext) {
    it("Should return an error for syntactically incorrect parameter content", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=not-a-date`,
        });

        assertTrue(
            response.status >= 400 && response.status < 600,
            `Server should return 4xx or 5xx status code for syntactically incorrect parameter (got ${response.status})`,
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
        } else {
            assertTrue(
                false,
                "Server should return an OperationOutcome for syntactically incorrect parameter",
            );
        }
    });

    it("Should return empty result set for logically incorrect but syntactically valid parameter", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=loinc|non-existent-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for logically incorrect parameter",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Bundle should have no entries",
        );
    });

    it("Should optionally include OperationOutcome with hints/warnings in empty result set", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?patient.identifier=http://example.com/fhir/identifier/mrn|non-existent-mrn`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for search with non-existent identifier",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should have zero total results");

        if (bundle.entry && bundle.entry.length > 0) {
            const outcomeEntry = bundle.entry.find((entry) =>
                entry.search?.mode === "outcome"
            );
            if (outcomeEntry) {
                assertEquals(
                    outcomeEntry.resource?.resourceType,
                    "OperationOutcome",
                    "Outcome entry should be an OperationOutcome",
                );
                const operationOutcome = outcomeEntry
                    .resource as OperationOutcome;
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.severity === "warning" ||
                        issue.severity === "information"
                    ),
                    "OperationOutcome should contain a warning or information issue",
                );
            }
        }
    });

    it("Should honor 'strict' handling preference for unknown parameters", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?unknownParameter=value`,
            headers: { "Prefer": "handling=strict" },
        });

        assertTrue(
            response.status >= 400 && response.status < 600,
            `Server should return 4xx or 5xx status code for unknown parameter in strict mode (got ${response.status})`,
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
        } else {
            assertTrue(
                false,
                "Server should return an OperationOutcome for unknown parameter in strict mode",
            );
        }
    });

    if (context.isLenientSearchHandlingSupported()) {
        it("Should honor 'lenient' handling preference for unknown parameters", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?unknownParameter=value`,
                headers: { "Prefer": "handling=lenient" },
            });

            assertEquals(
                response.status,
                200,
                "Server should return 200 OK for unknown parameter in lenient mode",
            );

            const bundle = response.jsonBody as Bundle;
            assertTrue(
                bundle.total !== undefined,
                "Bundle should have a total property",
            );
        });
    }
}
