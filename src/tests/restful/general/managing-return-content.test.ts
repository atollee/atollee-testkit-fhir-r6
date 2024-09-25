// tests/managing-return-content.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";

export function runManagingReturnContentTests(context: ITestContext) {
    it("Managing Return Content - Server Default Timezone", async () => {
        const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const dateHeader = response.headers.get("Date");
        assertExists(dateHeader, "Response should include a Date header");

        // Check if the Date header is in a valid format
        const dateRegex =
            /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT$/;
        assertEquals(
            dateRegex.test(dateHeader!),
            true,
            "Date header should be in the correct format",
        );
    });

    it("Managing Return Content - Return minimal content", async () => {
        const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
        const updatedPatientData = {
            resourceType: "Patient",
            id: validPatientId,
            // Include other fields to update
        };

        const response = await fetchWrapper({
            method: "PUT",
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Content-Type": "application/fhir+json",
                "Prefer": "return=minimal",
            },
            body: JSON.stringify(updatedPatientData),
        });

        assertEquals(response.success, true, "Request should be successful");
        assertTrue(
            response.headers.get("Location")?.indexOf(
                `Patient/${validPatientId}`,
            ) !== -1,
            "Should return Location header",
        );
        assertTrue(
            response.jsonBody === null || response.jsonBody === undefined,
            "Response body should be empty for minimal return",
        );
    });

    it("Managing Return Content - Return representation on update", async () => {
        const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
        const updatedPatientData = {
            resourceType: "Patient",
            id: validPatientId,
            // Include other fields to update
        };

        const response = await fetchWrapper({
            method: "PUT",
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Content-Type": "application/fhir+json",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(updatedPatientData),
        });

        assertEquals(response.status, 200, "Request should be successful");
        assertExists(
            response.jsonBody,
            "Response should include the resource representation",
        );
        assertEquals(
            response.jsonBody.resourceType,
            "Patient",
            "Returned resource should be a Patient",
        );
        assertEquals(
            response.jsonBody.id,
            validPatientId,
            "Returned resource should have the correct ID",
        );

        // Check that the Prefer header was acknowledged
        assertEquals(
            response.headers.get("Prefer"),
            "return=representation",
            "Response should acknowledge the Prefer header",
        );
    });

    it("Managing Return Content - Return OperationOutcome on update", async () => {
        const validPatientId = context.getValidPatientId();
        const updatedPatientData = {
            resourceType: "Patient",
            id: validPatientId,
            // Include other fields to update
        };

        const response = await fetchWrapper({
            method: "PUT",
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Content-Type": "application/fhir+json",
                "Prefer": "return=OperationOutcome",
            },
            body: JSON.stringify(updatedPatientData),
        });

        assertEquals(response.status, 200, "Request should be successful");
        assertExists(
            response.jsonBody,
            "Response should include an OperationOutcome",
        );
        assertEquals(
            response.jsonBody.resourceType,
            "OperationOutcome",
            "Returned resource should be an OperationOutcome",
        );
        assertEquals(
            response.headers.get("Prefer"),
            "return=OperationOutcome",
            "Response should acknowledge the Prefer header",
        );
    });

    it("Managing Return Content - Prefer header respected on create", async () => {
        const newPatientData = {
            resourceType: "Patient",
            // Include necessary fields for a new patient
        };

        const minimalResponse = await fetchWrapper({
            method: "POST",
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "Content-Type": "application/fhir+json",
                "Prefer": "return=minimal",
            },
            body: JSON.stringify(newPatientData),
        });

        const fullResponse = await fetchWrapper({
            method: "POST",
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "Content-Type": "application/fhir+json",
                "Prefer": "return=representation",
            },
            body: JSON.stringify(newPatientData),
        });

        assertEquals(
            minimalResponse.status,
            201,
            "Minimal response should be successful",
        );
        assertEquals(
            fullResponse.status,
            201,
            "Full response should be successful",
        );

        assertNotEquals(
            minimalResponse.jsonBody,
            fullResponse.jsonBody,
            "Minimal and full responses should be different",
        );
        assertTrue(
            minimalResponse.jsonBody === null ||
                minimalResponse.jsonBody === undefined,
            "Minimal response should have no body",
        );
        assertExists(
            fullResponse.jsonBody,
            "Full response should include the resource",
        );
        assertEquals(
            fullResponse.jsonBody.resourceType,
            "Patient",
            "Full response should return a Patient resource",
        );

        assertEquals(
            minimalResponse.headers.get("Prefer"),
            "return=minimal",
            "Minimal response should acknowledge the Prefer header",
        );
        assertEquals(
            fullResponse.headers.get("Prefer"),
            "return=representation",
            "Full response should acknowledge the Prefer header",
        );
    });
}
