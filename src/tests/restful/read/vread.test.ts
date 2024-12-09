// tests/vread.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runVreadTests(context: ITestContext) {
    it("vread - Retrieve specific version of a resource", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(
            initialResponse.success,
            true,
            "Initial read request should be successful",
        );
        const initialPatient = initialResponse.jsonBody as Patient;
        const currentVersionId = initialPatient.meta?.versionId;

        // Now, perform a vread operation
        const vreadResponse = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${validPatientId}/_history/${currentVersionId}`,
        });

        assertEquals(
            vreadResponse.success,
            true,
            "vread request should be successful",
        );
        const vreadPatient = vreadResponse.jsonBody as Patient;
        assertEquals(
            vreadPatient.id,
            validPatientId,
            "Returned resource should have the correct id",
        );
        assertEquals(
            vreadPatient.meta?.versionId,
            currentVersionId,
            "Returned resource should have the correct versionId",
        );
        assertExists(
            vreadResponse.headers.get("ETag"),
            "Response should include an ETag header",
        );
        assertExists(
            vreadResponse.headers.get("Last-Modified"),
            "Response should include a Last-Modified header",
        );
    });

    it("vread - Retrieve non-existent version with alphanumeric version id", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const nonExistentVersionId = "non-existent-version";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${validPatientId}/_history/${nonExistentVersionId}`,
        });

        assertEquals(
            response.success,
            false,
            "Request for non-existent version should fail",
        );
        assertEquals(
            response.status,
            404,
            "Should return 404 Not Found for non-existent version",
        );
    });
    it("vread - Retrieve non-existent version", async () => {
        // First create a test patient
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        // Get the current version of the patient
        const currentVersionResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(
            currentVersionResponse.success,
            true,
            "Request for current version should succeed",
        );
        const currentPatient = currentVersionResponse.jsonBody as Patient;
        assertExists(
            currentPatient.meta?.versionId,
            "Current patient should have a version ID",
        );

        // Create an invalid version number by adding 100 to the current version
        const currentVersion = parseInt(currentPatient.meta.versionId);
        const nonExistentVersionId = (currentVersion + 100).toString();

        // Try to retrieve the non-existent version
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${validPatientId}/_history/${nonExistentVersionId}`,
        });

        // Verify the response
        assertEquals(
            response.success,
            false,
            "Request for non-existent version should fail",
        );
        assertEquals(
            response.status,
            404,
            "Should return 404 Not Found for non-existent version",
        );

        // Verify error details in OperationOutcome if present
        if (response.jsonBody) {
            const outcome = response.jsonBody as OperationOutcome;
            assertExists(
                outcome.issue,
                "Error response should contain issue details",
            );
            assertTrue(
                outcome.issue.some((issue) =>
                    issue.severity === "error" &&
                    issue.code === "not-found"
                ),
                "Should indicate resource version not found in OperationOutcome",
            );
        }
    });

    it("vread - Retrieve deleted version", async () => {
        // This test assumes you have a way to delete a resource version
        // If not, you may need to skip this test or implement it differently

        // First, create a new patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "TestDelete" }],
            }),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const createdPatientId = createdPatient.id;
        const createdVersionId = Number.parseInt(
            createdPatient.meta?.versionId || "0",
        );

        // Now, delete the patient
        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${createdPatientId}`,
            method: "DELETE",
        });

        // Try to vread the deleted version
        const vreadResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${createdPatientId}/_history/${
                createdVersionId + 1
            }`,
        });

        assertEquals(
            vreadResponse.success,
            false,
            "vread request for deleted version should fail",
        );
        assertEquals(
            vreadResponse.status,
            410,
            "Should return 410 Gone for deleted version",
        );
    });

    it("vread - HEAD request", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const currentVersionId = initialPatient.meta?.versionId;

        // Now, perform a HEAD request
        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${validPatientId}/_history/${currentVersionId}`,
            method: "HEAD",
        });

        assertEquals(
            headResponse.success,
            true,
            "HEAD request should be successful",
        );
        assertEquals(
            headResponse.status,
            200,
            "HEAD request should return 200 OK",
        );
        assertExists(
            headResponse.headers.get("ETag"),
            "HEAD response should include an ETag header",
        );
        assertExists(
            headResponse.headers.get("Last-Modified"),
            "HEAD response should include a Last-Modified header",
        );
        assertTrue(
            !headResponse.jsonBody,
            "HEAD response should not include a body",
        );
    });
}
