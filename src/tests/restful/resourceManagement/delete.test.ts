// tests/delete.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, it } from "../../../../deps.test.ts";
import { Patient, OperationOutcome } from "npm:@types/fhir/r4.d.ts";

export function runDeleteTests(context: ITestContext) {
    it("Delete - Successful deletion", async () => {
        // First, create a patient to delete
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "DeleteTest" }],
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const patientId = createdPatient.id!;

        // Now, delete the patient
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "DELETE",
        });

        assertEquals(deleteResponse.success, true, "Delete should be successful");
        assertEquals([200, 202, 204].includes(deleteResponse.status), true, "Should return 200, 202, or 204 for successful deletion");
    });

    it("Delete - Attempt to read deleted resource", async () => {
        // First, create and delete a patient
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "DeleteReadTest" }],
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const patientId = createdPatient.id!;

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "DELETE",
        });

        // Now, attempt to read the deleted patient
        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(readResponse.success, false, "Read of deleted resource should fail");
        assertEquals(readResponse.status, 410, "Should return 410 Gone for deleted resource");
    });

    it("Delete - Non-existent resource", async () => {
        const nonExistentId = "non-existent-patient";
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${nonExistentId}`,
            method: "DELETE",
        });
        assertEquals(deleteResponse.success, true, "Delete of non-existent resource should be successful");
        assertEquals([200, 204].includes(deleteResponse.status), true, "Should return 200, 202, or 204 for non-existent resource");
    });

    it("Delete - Unsupported resource type", async () => {
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedResourceType/1",
            method: "DELETE",
        });

        assertEquals(deleteResponse.success, false, "Delete of unsupported resource type should fail");
        assertEquals(deleteResponse.status, 404, "Should return 404 Not Found for unsupported resource type");

        const operationOutcome = deleteResponse.jsonBody as OperationOutcome;

        // Optionally, check for an OperationOutcome in the response body
        if (operationOutcome) {
            assertEquals(operationOutcome.resourceType, "OperationOutcome", "Response should contain an OperationOutcome");
            assertEquals(operationOutcome.issue[0].code, "not-found", "Issue code should be 'not-found'");
        }
    });

    it("Delete - Referential integrity violation", async () => {
        // This test assumes your server enforces referential integrity
        // First, create a patient and a related resource (e.g., an Observation)
        const patient: Patient = {
            resourceType: "Patient",
            name: [{ family: "IntegrityTest" }],
        };

        const createPatientResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(patient),
        });

        const createdPatient = createPatientResponse.jsonBody as Patient;
        const patientId = createdPatient.id!;

        const observation = {
            resourceType: "Observation",
            status: "final",
            code: {
                coding: [{ system: "http://loinc.org", code: "55284-4", display: "Blood Pressure" }]
            },
            subject: {
                reference: `Patient/${patientId}`
            }
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation",
            method: "POST",
            body: JSON.stringify(observation),
        });

        // Now, attempt to delete the patient
        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "DELETE",
        });

        if (context.isReferentialIntegritySupported()) {
            assertEquals(deleteResponse.success, false, "Delete violating referential integrity should fail");
            assertEquals(deleteResponse.status, 409, "Should return 409 Conflict for referential integrity violation");
        } else {
            assertEquals(deleteResponse.success, true, "Referential integrity is not supported, so response should be successful");
        }
    });

    it("Delete - Bring back to life", async () => {
        // First, create and delete a patient
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "ResurrectTest" }],
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const patientId = createdPatient.id!;

        const deleteResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "DELETE",
        });

        const etag = deleteResponse.headers.get("ETag");

        // Now, bring the patient back to life
        const resurrectedPatient: Patient = {
            ...createdPatient,
            active: true,
        };

        const resurrectResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            headers: etag ? { "If-Match": etag } : {},
            body: JSON.stringify(resurrectedPatient),
        });

        assertEquals(resurrectResponse.success, true, "Resurrection should be successful");
        assertEquals(resurrectResponse.status, 200, "Should return 200 OK for successful resurrection");

        const resurrectedBody = resurrectResponse.jsonBody as Patient;
        assertEquals(resurrectedBody.active, true, "Resurrected patient should have updated data");
    });
}
