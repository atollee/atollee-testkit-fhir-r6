// tests/general-parameters.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertNotEquals, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runGeneralParametersTests(context: ITestContext) {
    const validPatientId = context.getValidPatientId(); // Use a known valid patient ID

    it("General Parameters - _format XML", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_format=xml`,
        });

        if (context.isXmlSupported()) {
            assertEquals(response.success, true, "Request should be successful");
            assertEquals(response.headers.get("Content-Type")?.includes("application/fhir+xml"), true, "Response should be in XML format");
            assertExists(response.rawBody, "Response should include raw XML body");
            assertEquals(response.rawBody.startsWith("<?xml"), true, "Raw body should start with XML declaration");
        } else {
            assertEquals(response.success, false, "XML is not supported so request should fail");
        }
    });

    it("General Parameters - _format JSON", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_format=json`,
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(response.headers.get("Content-Type")?.includes("application/fhir+json"), true, "Response should be in JSON format");
        assertExists(response.jsonBody, "Response should include parsed JSON body");
    });

    it("General Parameters - _format overriding Accept header", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_format=json`,
            headers: {
                "Accept": "application/fhir+xml"
            }
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(response.headers.get("Content-Type")?.includes("application/fhir+json"), true, "Response should be in JSON format despite XML Accept header");
        assertExists(response.jsonBody, "Response should include parsed JSON body");
    });

    it("General Parameters - _pretty true", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_pretty=true`,
        });

        assertEquals(response.success, true, "Request should be successful");
        assertExists(response.rawBody, "Response should include raw body");
        // Check for indentation in the raw body, which indicates pretty printing
        assertEquals(response.rawBody.includes("\n  "), true, "Response should be pretty printed");
    });

    it("General Parameters - _pretty false", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_pretty=false`,
        });

        assertEquals(response.success, true, "Request should be successful");
        assertExists(response.rawBody, "Response should include raw body");
        // Check for lack of indentation in the raw body
        assertEquals(response.rawBody.includes("\n  "), false, "Response should not be pretty printed");
    });

    it("General Parameters - _summary true", async () => {
        const fullResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const summaryResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_summary=true`,
        });

        assertEquals(summaryResponse.success, true, "Request should be successful");
        assertExists(summaryResponse.jsonBody, "Response should include JSON body");
        assertNotEquals(JSON.stringify(fullResponse.jsonBody).length, JSON.stringify(summaryResponse.jsonBody).length, "Summary response should be shorter than full response");
    });

    it("General Parameters - _elements", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}?_elements=id,name`,
        });

        assertEquals(response.status, 200, "Response status should be 200");
        assertExists(response.jsonBody, "Response should include JSON body");

        const patient = response.jsonBody as Patient;
        assertEquals(Object.keys(patient).length, 4, "Response should include resourceType, id, name, and meta");
        assertEquals(patient.resourceType, "Patient", "ResourceType should be Patient");
        assertExists(patient.id, "Response should include id");
        assertExists(patient.name, "Response should include name");
        assertExists(patient.meta, "Response should include meta");

        // Check that other fields are not present
        assertEquals(patient.birthDate, undefined, "BirthDate should not be included");
        assertEquals(patient.gender, undefined, "Gender should not be included");

        // Check for SUBSETTED tag in meta
        assertExists(patient.meta?.tag, "Meta tags should exist");
        const subsettedTag = patient.meta?.tag?.find(tag =>
            tag.system === "http://terminology.hl7.org/CodeSystem/v3-ObservationValue" &&
            tag.code === "SUBSETTED"
        );
        assertExists(subsettedTag, "SUBSETTED tag should be present in meta");

        // Optionally, check that meta doesn't contain other elements
        assertEquals(patient.meta?.versionId, undefined, "Meta should not include versionId");
        assertEquals(patient.meta?.lastUpdated, undefined, "Meta should not include lastUpdated");
    });
}
