// tests/update.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { Bundle, OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runUpdateTests(context: ITestContext) {
    it("update - Update existing resource", async () => {
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

        // Modify the patient
        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active, // Toggle the active status
        };

        // Perform the update
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Update request should be successful",
        );
        assertEquals(
            updateResponse.status,
            200,
            "Should return 200 OK for successful update",
        );
        assertExists(
            updateResponse.headers.get("Location"),
            "Response should include a Location header",
        );
        assertExists(
            updateResponse.headers.get("ETag"),
            "Response should include an ETag header",
        );
        assertExists(
            updateResponse.headers.get("Last-Modified"),
            "Response should include a Last-Modified header",
        );

        const updatedResponsePatient = updateResponse.jsonBody as Patient;
        assertExists(
            updatedResponsePatient.meta?.versionId,
            "Updated resource should have a new version id",
        );
        assertEquals(
            updatedResponsePatient.active,
            !initialPatient.active,
            "The active status should be toggled",
        );
    });

    it("update - Create new resource with specified ID", async () => {
        const newPatientId = "new-test-patient-" + Date.now();
        const newPatient: Patient = {
            resourceType: "Patient",
            id: newPatientId,
            active: true,
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${newPatientId}`,
            method: "PUT",
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            createResponse.success,
            true,
            "Create request should be successful",
        );
        assertEquals(
            createResponse.status,
            201,
            "Should return 201 Created for new resource",
        );
        assertExists(
            createResponse.headers.get("Location"),
            "Response should include a Location header",
        );
    });

    it("update - Attempt update with mismatched ID", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const mismatchedPatient: Patient = {
            resourceType: "Patient",
            id: "mismatched-id**",
            active: true,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(mismatchedPatient),
        });

        assertEquals(
            updateResponse.success,
            false,
            "Update with mismatched ID should fail",
        );
        assertEquals(
            updateResponse.status,
            400,
            "Should return 400 Bad Request for mismatched ID",
        );
        const operationOutcome = updateResponse.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "Response should include an OperationOutcome with issues",
        );
    });

    it("update - Attempt update with no ID in resource", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const noIdPatient: Patient = {
            resourceType: "Patient",
            active: true,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(noIdPatient),
        });
        assertEquals(
            updateResponse.success,
            false,
            "Update with no ID should fail",
        );
        assertEquals(
            updateResponse.status,
            400,
            "Should return 400 Bad Request for no ID",
        );
        const operationOutcome = updateResponse.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "Response should include an OperationOutcome with issues",
        );
    });

    it("update - Verify server ignores provided meta.versionId and meta.lastUpdated", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;

        const updatedPatient: Patient = {
            ...initialPatient,
            meta: {
                ...initialPatient.meta,
                versionId: "should-be-ignored",
                lastUpdated: "2000-01-01T00:00:00Z",
            },
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Update request should be successful",
        );
        const updatedResponsePatient = updateResponse.jsonBody as Patient;
        assertNotEquals(
            updatedResponsePatient.meta?.versionId,
            "should-be-ignored",
            "Server should ignore provided versionId",
        );
        assertNotEquals(
            updatedResponsePatient.meta?.lastUpdated,
            "2000-01-01T00:00:00Z",
            "Server should ignore provided lastUpdated",
        );
    });

    it("update - Conditional update (If-Match)", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const currentETag = initialResponse.headers.get("ETag");

        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": currentETag!,
            },
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Conditional update should be successful",
        );
        assertEquals(
            updateResponse.status,
            200,
            "Should return 200 OK for successful conditional update",
        );
    });

    it("update - Conditional update with outdated ETag", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const outdatedETag = `W/"outdated-version"`;

        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": outdatedETag,
            },
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            false,
            "Conditional update with outdated ETag should fail",
        );
        assertEquals(
            updateResponse.status,
            412,
            "Should return 412 Precondition Failed for outdated ETag",
        );
    });

    it("update - Preserve XML comments and formatting", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const xmlPatient = `
            <Patient xmlns="http://hl7.org/fhir">
                <id value="${validPatientId}"/>
                <!-- This is a comment that should be preserved -->
                <active value="true"/>
            </Patient>
        `;

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "Content-Type": "application/fhir+xml",
            },
            body: xmlPatient,
        });

        if (context.isXmlSupported()) {
            assertEquals(
                updateResponse.success,
                true,
                "XML update should be successful",
            );

            // Fetch the updated resource
            const getResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient/${validPatientId}`,
                headers: {
                    "Accept": "application/fhir+xml",
                },
            });

            assertEquals(
                getResponse.success,
                true,
                "Get request should be successful",
            );
            const updatedXml = getResponse.rawBody;
            assertEquals(
                updatedXml.includes(
                    "<!-- This is a comment that should be preserved -->",
                ),
                true,
                "XML comments should be preserved",
            );
        } else {
            assertEquals(
                updateResponse.success,
                false,
                "XML is not supported, should not be successful.",
            );
        }
    });

    it("update - Handle SUBSETTED resource", async () => {
        // First, perform a search that returns a SUBSETTED resource
        const searchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_elements=id,active",
        });

        assertEquals(
            searchResponse.success,
            true,
            "Search request should be successful",
        );
        const bundle = searchResponse.jsonBody as Bundle;
        const subsettedPatient = bundle.entry?.[0].resource as Patient;

        // Now try to update this SUBSETTED resource
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${subsettedPatient.id}`,
            method: "PUT",
            body: JSON.stringify(subsettedPatient),
        });

        // The server's behavior here can vary. It might accept the update, reject it, or merge it.
        // Adjust these assertions based on your server's expected behavior.
        assertEquals(
            updateResponse.success,
            true,
            "Update of SUBSETTED resource should be handled",
        );
        assertEquals(
            [200, 400].includes(updateResponse.status),
            true,
            "Server should either accept or reject the SUBSETTED update",
        );
    });

    it("update - Attempt to update non-existent resource", async () => {
        const nonExistentId = "non-existent-patient-" + Date.now();
        const newPatient: Patient = {
            resourceType: "Patient",
            id: nonExistentId,
            active: true,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${nonExistentId}`,
            method: "PUT",
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Update of non-existent resource should be successful",
        );
        assertEquals(
            updateResponse.status,
            201,
            "Should return 201 Created for new resource",
        );
    });

    it("update - Verify update response matches subsequent read", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;

        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Update request should be successful",
        );

        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(
            readResponse.success,
            true,
            "Read request should be successful",
        );
        assertEquals(
            JSON.stringify(updateResponse.jsonBody),
            JSON.stringify(readResponse.jsonBody),
            "Update response should match subsequent read",
        );
    });
}
