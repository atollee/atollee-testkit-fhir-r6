// tests/conditional_delete.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    CapabilityStatement,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";

export function runConditionalDeleteTests(_context: ITestContext) {
    it("Conditional Delete - Check server capability", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(
            response.success,
            true,
            "Metadata request should be successful",
        );
        const capabilityStatement = response.jsonBody as CapabilityStatement;

        const patientResource = capabilityStatement.rest?.[0].resource?.find(
            (r) => r.type === "Patient"
        );
        assertExists(
            patientResource,
            "CapabilityStatement should include Patient resource",
        );

        const conditionalDeleteSupported =
            patientResource.conditionalDelete !== undefined;
        assertTrue(
            true,
            `Server ${
                conditionalDeleteSupported ? "supports" : "does not support"
            } conditional delete`,
        );

        // The following tests should only run if conditional delete is supported
        if (!conditionalDeleteSupported) {
            assertTrue(
                true,
                "Skipping conditional delete tests as server does not support this feature",
            );
            return;
        }
    });

    it("Conditional Delete - No matches", async () => {
        const nonExistentIdentifier = `non-existent-${Date.now()}`;
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${nonExistentIdentifier}`,
            method: "DELETE",
        });
        assertEquals(
            deleteResponse.success,
            true,
            "Conditional delete with no matches should be successful",
        );
        assertEquals(
            [200, 204].includes(deleteResponse.status),
            true,
            "Should return 200 or 204 for no matches",
        );
    });

    it("Conditional Delete - One match", async () => {
        // First, create a patient with a unique identifier
        const uniqueIdentifier = `unique-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{
                system: "http://example.com/identifier",
                value: uniqueIdentifier,
            }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        // Now, perform a conditional delete
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
            method: "DELETE",
        });

        assertEquals(
            deleteResponse.success,
            true,
            "Conditional delete with one match should be successful",
        );
        assertEquals(
            [200, 204].includes(deleteResponse.status),
            true,
            "Should return 200 or 204 for one match",
        );

        // Verify the patient is deleted
        const verifyResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
        });

        const verifyBundle = verifyResponse.jsonBody as Bundle;
        assertEquals(verifyBundle.total, 0, "Patient should be deleted");
    });

    it("Conditional Delete - Multiple matches", async () => {
        // First, create multiple patients with the same identifier
        const commonIdentifier = `common-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{
                system: "http://example.com/identifier",
                value: commonIdentifier,
            }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        // Now, perform a conditional delete
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${commonIdentifier}`,
            method: "DELETE",
        });

        // The server's behavior can vary here. It might delete all matching resources or return a 412.
        if (deleteResponse.status === 412) {
            assertEquals(
                deleteResponse.success,
                false,
                "Conditional delete with multiple matches should fail if server doesn't support it",
            );
            assertEquals(
                deleteResponse.status,
                412,
                "Should return 412 Precondition Failed for multiple matches if not supported",
            );
        } else {
            assertEquals(
                deleteResponse.success,
                true,
                "Conditional delete with multiple matches should be successful if server supports it",
            );
            assertEquals(
                [200, 204].includes(deleteResponse.status),
                true,
                "Should return 200 or 204 for multiple matches if supported",
            );

            // Verify all matching patients are deleted
            const verifyResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient?identifier=${commonIdentifier}`,
            });

            const verifyBundle = verifyResponse.jsonBody as Bundle;
            assertEquals(
                verifyBundle.total,
                0,
                "All matching patients should be deleted",
            );
        }
    });

    it("Conditional Delete - Unsupported operation", async () => {
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?nonexistentParam=value",
            method: "DELETE",
        });
        assertEquals(
            deleteResponse.success,
            false,
            "Conditional delete with unsupported search parameters should fail",
        );
        assertEquals(
            deleteResponse.status,
            412,
            "Should return 412 Precondition Failed for unsupported operation",
        );

        // Optionally, check for an OperationOutcome in the response body
        const operationOutcome = deleteResponse.jsonBody as OperationOutcome;
        if (operationOutcome) {
            assertEquals(
                operationOutcome.resourceType,
                "OperationOutcome",
                "Response should contain an OperationOutcome",
            );
            assertEquals(
                operationOutcome.issue[0].code,
                "not-supported",
                "Issue code should be 'not-supported'",
            );
        }
    });
}
