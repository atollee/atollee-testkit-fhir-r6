// tests/rejecting_updates.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient, OperationOutcome } from "npm:@types/fhir/r4.d.ts";

export function runRejectingUpdatesTests(context: ITestContext) {
    const validPatientId = context.getValidPatientId();

    it("Rejecting Updates - 400 Bad Request (Invalid Resource)", async () => {
        const invalidPatient = {
            resourceType: "Patient",
            id: validPatientId,
            invalidField: "This field doesn't exist",
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(invalidPatient),
        });

        assertEquals(response.success, false, "Update with invalid resource should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request for invalid resource");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "Response should include an OperationOutcome with issues");
    });

    it("Rejecting Updates - 401 Unauthorized", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            id: validPatientId,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: false,  // Explicitly not authorizing this request
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(patient),
        });

        assertEquals(response.success, false, "Unauthorized update should fail");
        assertEquals(response.status, 401, "Should return 401 Unauthorized for update without proper authorization");
    });

    it("Rejecting Updates - 404 Not Found (Unsupported Resource Type)", async () => {
        const unsupportedResource = {
            resourceType: "UnsupportedType",
            id: "test-id",
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedType/test-id",
            method: "PUT",
            body: JSON.stringify(unsupportedResource),
        });

        assertEquals(response.success, false, "Update with unsupported resource type should fail");
        assertEquals(response.status, 404, "Should return 404 Not Found for unsupported resource type");
    });

    it(`Rejecting Updates - 405 Method Not Allowed (Client-defined ID ${context.isClientDefinedIdsAllowed() ? '' : 'not '}allowed)`, async () => {
        const clientDefinedId = `client-defined-id-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            id: clientDefinedId,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${clientDefinedId}`,
            method: "PUT",
            body: JSON.stringify(newPatient),
        });

        if (context.isClientDefinedIdsAllowed()) {
            assertEquals(response.success, true, "Update with client-defined ID should succeed when allowed");
            assertEquals(response.status, 201, "Should return 201 OK when client-defined IDs are supported");

            // Verify that the resource was actually updated
            const updatedPatient = response.jsonBody as Patient;
            assertEquals(updatedPatient.id, clientDefinedId, "The returned patient should have the client-defined ID");
            assertEquals(updatedPatient.active, true, "The returned patient should have the updated 'active' status");
        } else {
            // Note: This test assumes the server doesn't allow client-defined IDs.
            // If your server does allow this, you should expect a different status code.
            assertEquals(response.success, false, "Update with client-defined ID should fail if not allowed");
            assertEquals(response.status, 405, "Should return 405 Method Not Allowed if client-defined IDs are not supported");
        }
    });

    it("Rejecting Updates - 409 Conflict (Version conflict)", async () => {
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const outdatedVersionId = (parseInt(initialPatient.meta?.versionId || "0") - 1).toString();

        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": `W/"${outdatedVersionId}"`,
            },
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(response.success, false, "Update with outdated version should fail");
        assertEquals(response.status, 412, "Should return 412 Precondition failed for version conflict");
    });
}
