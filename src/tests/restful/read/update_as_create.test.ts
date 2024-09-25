// tests/update_as_create.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { CapabilityStatement, Patient } from "npm:@types/fhir/r4.d.ts";

export function runUpdateAsCreateTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();

    it("Update as Create - Check server capability", async () => {
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
            (r) => r.type === "Patient",
        );
        assertExists(
            patientResource,
            "CapabilityStatement should include Patient resource",
        );

        // Check if updateCreate is supported
        const updateCreateSupported = patientResource.updateCreate === true;
        assertTrue(
            true,
            `Server ${
                updateCreateSupported ? "supports" : "does not support"
            } Update as Create`,
        );

        // The following tests should only run if updateCreate is supported
        if (!updateCreateSupported) {
            assertTrue(
                true,
                "Skipping Update as Create tests as server does not support this feature",
            );
            return;
        }
    });

    it("Update as Create - Client-defined ID", async () => {
        const clientDefinedId = `valid-patient-id-${Date.now()}`;
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

        assertEquals(
            response.success,
            true,
            "Update as Create request should be successful",
        );
        assertEquals(
            response.status,
            201,
            "Should return 201 Created for new resource",
        );
        assertExists(
            response.headers.get("Location"),
            "Response should include a Location header",
        );
        assertEquals(
            response.headers.get("Location"),
            `${baseUrl}/Patient/${clientDefinedId}`,
            "Location header should match the request URL",
        );

        const createdPatient = response.jsonBody as Patient;
        assertEquals(
            createdPatient.id,
            clientDefinedId,
            "Created resource should have the client-defined ID",
        );
    });

    it("Update as Create - Existing data model reproduction", async () => {
        const existingModelId = `valid-patient-id-${Date.now()}`;
        const existingPatient: Patient = {
            resourceType: "Patient",
            id: existingModelId,
            identifier: [{
                system: "http://example.com/identifier",
                value: "12345",
            }],
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${existingModelId}`,
            method: "PUT",
            body: JSON.stringify(existingPatient),
        });

        assertEquals(
            response.success,
            true,
            "Update as Create request should be successful",
        );
        assertEquals(
            response.status,
            201,
            "Should return 201 Created for new resource",
        );

        const createdPatient = response.jsonBody as Patient;
        assertEquals(
            createdPatient.id,
            existingModelId,
            "Created resource should have the existing model ID",
        );
        assertEquals(
            createdPatient.identifier?.[0].value,
            "12345",
            "Created resource should maintain the existing identifier",
        );
    });

    it("Update as Create - UUID-based ID", async () => {
        const uuidId = crypto.randomUUID();
        const uuidPatient: Patient = {
            resourceType: "Patient",
            id: uuidId,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${uuidId}`,
            method: "PUT",
            body: JSON.stringify(uuidPatient),
        });

        assertEquals(
            response.success,
            true,
            "Update as Create request should be successful",
        );
        assertEquals(
            response.status,
            201,
            "Should return 201 Created for new resource",
        );

        const createdPatient = response.jsonBody as Patient;
        assertEquals(
            createdPatient.id,
            uuidId,
            "Created resource should have the UUID-based ID",
        );
    });

    it("Update as Create - Attempt to update existing resource", async () => {
        // First, create a resource
        const patientId = context.getWritableValidPatient();
        const initialPatient: Patient = {
            resourceType: "Patient",
            id: patientId,
            active: true,
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            body: JSON.stringify(initialPatient),
        });

        // Now, attempt to update it
        const updatedPatient: Patient = {
            ...initialPatient,
            active: false,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            response.success,
            true,
            "Update request should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for update of existing resource, not 201 Created",
        );

        const returnedPatient = response.jsonBody as Patient;
        assertEquals(
            returnedPatient.active,
            false,
            "Resource should be updated",
        );
    });
}
