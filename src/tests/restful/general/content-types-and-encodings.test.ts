// tests/content-types-and-encodings.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runContentTypesAndEncodingsTests(context: ITestContext) {
    const formatSupport = {
        xml: context.isXmlSupported(), // Set to true if XML is supported
        turtle: context.isTurtleSupported(), // Set to true if Turtle is supported
    };

    it("Content Types - JSON", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+json",
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(
            response.headers.get("Content-Type")?.startsWith(
                "application/fhir+json",
            ),
            true,
            "Response should be in JSON format",
        );
        assertExists(
            response.jsonBody,
            "Response should include parsed JSON body",
        );
    });
    async function testContentType(
        format: string,
        mimeType: string,
        expectedContentType: string,
    ) {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": mimeType,
            },
        });

        if (
            (format === "xml" && formatSupport.xml) ||
            (format === "turtle" && formatSupport.turtle)
        ) {
            // Test for supported format
            assertEquals(
                response.status,
                200,
                `Request for ${format} should be successful`,
            );
            assertEquals(
                response.headers.get("Content-Type")?.startsWith(
                    expectedContentType,
                ),
                true,
                `Response should be in ${format} format`,
            );
            assertExists(
                response.rawBody,
                `Response should include raw ${format} body`,
            );

            if (format === "xml") {
                assertEquals(
                    response.rawBody.startsWith("<?xml"),
                    true,
                    "Raw body should start with XML declaration",
                );
            }
            // Add specific checks for Turtle format if needed
        } else {
            // Test for unsupported format
            assertEquals(
                response.status,
                406,
                `Request for ${format} should return 406 Not Acceptable`,
            );
            assertEquals(
                response.headers.get("Content-Type"),
                "application/fhir+json",
                "Error response should be in JSON format",
            );

            const errorBody = JSON.parse(response.rawBody);
            assertExists(
                errorBody.resourceType,
                "Error response should be an OperationOutcome",
            );
            assertEquals(
                errorBody.resourceType,
                "OperationOutcome",
                "Error response should be an OperationOutcome",
            );

            const issue = errorBody.issue[0];
            assertEquals(
                issue.severity,
                "error",
                "Issue severity should be error",
            );
            assertEquals(
                issue.code,
                "not-acceptable",
                "Issue code should be not-acceptable",
            );
            assertExists(
                issue.diagnostics,
                "Diagnostics should explain the error",
            );
        }
    }

    it("Content Types - Turtle (RDF)", async () => {
        await testContentType(
            "turtle",
            "application/fhir+turtle",
            "application/fhir+turtle",
        );
    });

    it("Content Types - Generic XML", async () => {
        await testContentType("xml", "application/xml", "application/xml");
    });

    it("Content Types - FHIR XML", async () => {
        await testContentType(
            "xml",
            "application/fhir+xml",
            "application/fhir+xml",
        );
    });

    it("Content Types - JSON - Supported", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+json",
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        assertEquals(
            response.headers.get("Content-Type"),
            "application/fhir+json",
            "Response should be in JSON format",
        );
        assertExists(response.rawBody, "Response should include raw JSON body");

        const body = JSON.parse(response.rawBody);
        assertEquals(
            body.resourceType,
            "Patient",
            "Response should be a Patient resource",
        );
    });

    it("Content Types - Generic JSON", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/json",
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(
            response.headers.get("Content-Type")?.startsWith(
                "application/json",
            ),
            true,
            "Response should be in JSON format",
        );
        assertExists(
            response.jsonBody,
            "Response should include parsed JSON body",
        );
    });

    it("Content Types - Unsupported format", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/unsupported-format",
            },
        });

        assertEquals(response.success, false, "Request should fail");
        assertEquals(
            response.status,
            406,
            "Should return 406 Not Acceptable for unsupported format",
        );
    });

    it("Content Types - POST with unsupported format", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Content-Type": "application/unsupported-format",
            },
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "Test" }],
            }),
        });

        assertEquals(response.success, false, "Request should fail");
        assertEquals(
            response.status,
            415,
            "Should return 415 Unsupported Media Type for unsupported format",
        );
    });

    it("Encodings - UTF-8", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+json; charset=utf-8",
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(
            response.headers.get("Content-Type")?.includes("charset=utf-8"),
            true,
            "Response should specify UTF-8 encoding",
        );
    });

    it("Content Types - Search with x-www-form-urlencoded", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
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
