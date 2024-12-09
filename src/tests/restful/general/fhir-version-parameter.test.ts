// tests/fhir-version-parameter.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runFhirVersionParameterTests(context: ITestContext) {
    it("FHIR Version Parameter - JSON with current version", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+json; fhirVersion=5.0",
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(
            response.headers.get("Content-Type")?.includes("fhirVersion=5.0"),
            true,
            "Response should specify FHIR version 5.0",
        );
        assertExists(
            response.jsonBody,
            "Response should include parsed JSON body",
        );
    });

    it("FHIR Version Parameter - XML with current version", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+xml; fhirVersion=5.0",
            },
        });

        if (context.isXmlSupported()) {
            assertEquals(
                response.success,
                true,
                "Request should be successful",
            );
            assertEquals(
                response.headers.get("Content-Type")?.includes(
                    "fhirVersion=5.0",
                ),
                true,
                "Response should specify FHIR version 5.0",
            );
            assertExists(
                response.rawBody,
                "Response should include raw XML body",
            );
        } else {
            assertEquals(
                response.success,
                false,
                "Request should be not successful as XML is not supported",
            );
        }
    });

    it("FHIR Version Parameter - Unsupported version", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+json; fhirVersion=0.0",
            },
        });

        assertEquals(response.success, false, "Request should fail");
        assertEquals(
            response.status,
            406,
            "Should return 406 Not Acceptable for unsupported version",
        );
    });

    it("FHIR Version Parameter - Create with version specified", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Version"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Content-Type": "application/fhir+json; fhirVersion=5.0",
                "Accept": "application/fhir+json; fhirVersion=5.0",
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            response.success,
            true,
            "Create request should be successful",
        );
        assertEquals(
            response.headers.get("Content-Type")?.includes("fhirVersion=5.0"),
            true,
            "Response should specify FHIR version 5.0",
        );
    });

    it("FHIR Version Parameter - Mismatched versions", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Mismatch"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Content-Type": "application/fhir+json; fhirVersion=5.0",
                "Accept": "application/fhir+json; fhirVersion=4.0",
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            response.success,
            false,
            "Request with mismatched versions should fail",
        );
        assertEquals(
            response.status,
            400,
            "Should return 400 Bad Request for mismatched versions",
        );
    });

    it("FHIR Version Parameter - Search with version specified", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=Test",
            headers: {
                "Accept": "application/fhir+json; fhirVersion=5.0",
            },
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );
        assertEquals(
            response.headers.get("Content-Type")?.includes("fhirVersion=5.0"),
            true,
            "Response should specify FHIR version 5.0",
        );
        assertExists(
            response.jsonBody,
            "Response should include search results",
        );
        assertEquals(
            response.jsonBody.resourceType,
            "Bundle",
            "Search results should be a Bundle",
        );
    });
}
