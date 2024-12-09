// tests/search/responses/error_handling.parameter_handling.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runErrorHandlingParameterHandlingTests(context: ITestContext) {
    it("Should ignore unknown parameters by default", async () => {
        // First, create a patient to ensure we have at least one result
        const patient = await createTestPatient(context, {
            family: "UnknownParamTest",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=UnknownParamTest&unknownParameter=value`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK when ignoring unknown parameters",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.total! > 0,
            "Bundle should have results despite unknown parameter",
        );

        // Check if the created patient is in the results
        const patientEntry = bundle.entry?.find((entry) =>
            entry.resource?.id === patient.id
        );
        assertExists(
            patientEntry,
            "Created patient should be in the search results",
        );

        // Check if the unknown parameter is not in the self link
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertFalse(
            selfLink.url.includes("unknownParameter"),
            "Self link should not include the unknown parameter",
        );
    });

    it("Should return an error with Prefer header set to 'handling=strict'", async () => {
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

    it("Should ignore unknown parameters with Prefer header set to 'handling=lenient'", async () => {
        // First, create a patient to ensure we have at least one result
        const patient = await createTestPatient(context, {
            family: "LenientTest",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=LenientTest&unknownParameter=value`,
            headers: { "Prefer": "handling=lenient" },
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK for unknown parameter in lenient mode",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.total! > 0,
            "Bundle should have results despite unknown parameter",
        );

        // Check if the created patient is in the results
        const patientEntry = bundle.entry?.find((entry) =>
            entry.resource?.id === patient.id
        );
        assertExists(
            patientEntry,
            "Created patient should be in the search results",
        );

        // Check if the unknown parameter is not in the self link
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertFalse(
            selfLink.url.includes("unknownParameter"),
            "Self link should not include the unknown parameter",
        );
    });

    it("Should honor Prefer header when possible", async () => {
        // Test with strict handling
        const strictResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?unknownParameter=value`,
            headers: { "Prefer": "handling=strict" },
        });

        // Test with lenient handling
        const lenientResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?unknownParameter=value`,
            headers: { "Prefer": "handling=lenient" },
        });

        // Check if the server behaved differently for strict and lenient modes
        assertNotEquals(
            strictResponse.status,
            lenientResponse.status,
            "Server should behave differently for strict and lenient modes",
        );

        if (strictResponse.status >= 400 && strictResponse.status < 600) {
            assertTrue(
                lenientResponse.status === 200,
                "Server should return 200 OK for lenient mode when it returns an error for strict mode",
            );
        } else {
            console.log(
                "Server did not return an error for strict mode. This is allowed but not required.",
            );
        }
    });
}
