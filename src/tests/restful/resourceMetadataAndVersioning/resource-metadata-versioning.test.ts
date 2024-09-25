// tests/resource-metadata-versioning.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertNotEquals, it } from "../../../../deps.test.ts";

export function runResourceMetadataVersioningTests(context: ITestContext) {
    const patientId = context.getValidPatientId(); // Use a known patient ID for testing

    it("Resource Metadata and Versioning - Logical Id", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const patient = response.jsonBody as Patient;

        assertEquals(patient.id, patientId, "Logical Id in the resource should match the Id in the URL");
    });

    it("Resource Metadata and Versioning - Version Id and ETag", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const patient = response.jsonBody as Patient;

        assertExists(patient.meta?.versionId, "Resource should have a version Id");
        assertExists(response.headers.get("ETag"), "Response should include an ETag header");

        const etag = response.headers.get("ETag");
        assertEquals(etag?.startsWith('W/"'), true, 'ETag should start with W/"');
        assertEquals(etag?.endsWith('"'), true, 'ETag should end with "');

        const versionFromEtag = etag?.slice(3, -1); // Remove W/" and "
        assertEquals(versionFromEtag, patient.meta?.versionId, "Version Id in ETag should match resource meta.versionId");
    });

    it("Resource Metadata and Versioning - Last Modified", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const patient = response.jsonBody as Patient;

        assertExists(patient.meta?.lastUpdated, "Resource should have a lastUpdated timestamp");
        assertExists(response.headers.get("Last-Modified"), "Response should include a Last-Modified header");

        const lastModifiedHeader = response.headers.get("Last-Modified");
        const lastModifiedResource = new Date(patient.meta!.lastUpdated!).toUTCString();
        assertEquals(lastModifiedHeader, lastModifiedResource, "Last-Modified header should match resource meta.lastUpdated");
    });

    it("Resource Metadata and Versioning - Update and Version Change", async () => {
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const initialEtag = initialResponse.headers.get("ETag");

        // Update the patient
        const updatedPatient = { ...initialPatient, active: !initialPatient.active };
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(updateResponse.success, true, "Update request should be successful");

        // Get the updated version
        const finalResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const finalPatient = finalResponse.jsonBody as Patient;
        const finalEtag = finalResponse.headers.get("ETag");

        assertNotEquals(initialEtag, finalEtag, "ETag should change after an update");
        assertNotEquals(initialPatient.meta?.versionId, finalPatient.meta?.versionId, "Version Id should change after an update");
        assertNotEquals(initialPatient.meta?.lastUpdated, finalPatient.meta?.lastUpdated, "Last Updated timestamp should change after an update");
    });
}
