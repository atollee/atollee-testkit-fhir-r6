// tests/read.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runReadTests(context: ITestContext) {
    const validPatientId = context.getValidPatientId();

    it("Read - Successful read of existing resource", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(response.success, true, "Read request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful read");
        const patient = response.jsonBody as Patient;
        assertEquals(patient.id, validPatientId, "Returned resource should have the correct id");
        assertExists(response.headers.get("ETag"), "Response should include an ETag header");
        assertExists(response.headers.get("Last-Modified"), "Response should include a Last-Modified header");
    });

    it("Read - Attempt to read non-existent resource", async () => {
        const nonExistentId = `non-existent-patient-${Date.now()}-99`;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${nonExistentId}`,
        });

        assertEquals(response.success, false, "Read request for non-existent resource should fail");
        assertEquals(response.status, 404, "Should return 404 Not Found for non-existent resource");
    });

    it("Read - Attempt to read deleted resource", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({ resourceType: "Patient", name: [{ family: "DeleteTest" }] }),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const patientId = createdPatient.id;

        // Now, delete the patient
        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "DELETE",
        });

        // Try to read the deleted patient
        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(readResponse.success, false, "Read request for deleted resource should fail");
        assertEquals(readResponse.status, 410, "Should return 410 Gone for deleted resource");
    });

    it("Read - Summary parameter (text)", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_summary=text`,
        });

        assertEquals(response.success, true, "Read request with summary parameter should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful read with summary");
        const patient = response.jsonBody as Patient;
        assertExists(patient.text, "Returned resource should include text");
        assertEquals(Object.keys(patient).length <= 3, true, "Returned resource should only include a subset of data");
    });

    it("Read - Elements parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_elements=id,name`,
        });

        assertEquals(response.success, true, "Read request with elements parameter should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful read with elements");
        const patient = response.jsonBody as Patient;
        assertExists(patient.id, "Returned resource should include id");
        assertExists(patient.name, "Returned resource should include name");
        assertEquals(Object.keys(patient).length, 3, "Returned resource should only include specified elements plus resourceType");
    });

    it("Read - HEAD request", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "HEAD",
        });

        assertEquals(response.success, true, "HEAD request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful HEAD request");
        assertExists(response.headers.get("ETag"), "HEAD response should include an ETag header");
        assertExists(response.headers.get("Last-Modified"), "HEAD response should include a Last-Modified header");
        assertEquals(response.jsonBody, undefined, "HEAD response should not include a body");
    });
}
