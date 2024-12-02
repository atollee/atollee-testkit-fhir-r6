// tests/http-headers.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runHttpHeaderTests(context: ITestContext) {
    it("HTTP Headers - Accept header for content negotiation", async () => {
        const patient = await createTestPatient(context);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            headers: {
                "Accept": "application/fhir+json; fhirVersion=4.0",
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
    });

    it("HTTP Headers - ETag in response", async () => {
        const patient = await createTestPatient(context);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const etag = response.headers.get("ETag");
        assertExists(etag, "Response should include an ETag header");
        assertEquals(
            etag?.startsWith('W/"'),
            true,
            'ETag should start with W/"',
        );
        assertEquals(etag?.endsWith('"'), true, 'ETag should end with "');
    });

    it("HTTP Headers - If-Match for conditional update", async () => {
        // First, get the current ETag
        const patient = await createTestPatient(context);
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
        });
        const currentEtag = initialResponse.headers.get("ETag");

        // Now, attempt a conditional update
        const updatedPatient = {
            ...initialResponse.jsonBody,
            active: !(initialResponse.jsonBody as Patient).active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id!}`,
            method: "PUT",
            headers: {
                "If-Match": currentEtag!,
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
            "Successful update should return 200 OK",
        );
    });

    it("HTTP Headers - If-Modified-Since for conditional read", async () => {
        const pastDate = new Date(Date.now() - 86400000).toUTCString(); // 24 hours ago
        const patient = await createTestPatient(context);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            headers: {
                "If-Modified-Since": pastDate,
            },
        });

        assertEquals(
            response.status === 200 || response.status === 304,
            true,
            "Should return 200 OK if modified, or 304 Not Modified",
        );
    });

    it("HTTP Headers - If-None-Exist for conditional create", async () => {
        const uniqueIdentifier = `unique-${Date.now()}`;
        const newPatient = {
            resourceType: "Patient",
            identifier: [{
                system: "http://example.com/identifiers",
                value: uniqueIdentifier,
            }],
            name: [{ family: "Test", given: ["Conditional"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist":
                    `identifier=http://example.com/identifiers|${uniqueIdentifier}`,
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            response.status === 201 || response.status === 200,
            true,
            "Should return 201 Created if new, or 200 OK if existing",
        );
    });

    it("HTTP Headers - If-None-Match for conditional read", async () => {
        // First, get the current ETag
        const patient = await createTestPatient(context);
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
        });
        const currentEtag = initialResponse.headers.get("ETag");

        // Now, attempt a conditional read
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            headers: {
                "If-None-Match": currentEtag!,
            },
        });

        assertEquals(
            response.status,
            304,
            "Should return 304 Not Modified if ETag matches",
        );
    });

    it("HTTP Headers - Last-Modified in response", async () => {
        const patient = await createTestPatient(context);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
        });

        assertEquals(response.success, true, "Request should be successful");
        const lastModified = response.headers.get("Last-Modified");
        assertExists(
            lastModified,
            "Response should include a Last-Modified header",
        );
        assertEquals(
            isNaN(Date.parse(lastModified!)),
            false,
            "Last-Modified should be a valid date",
        );
    });

    it("HTTP Headers - Prefer for return preference", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Prefer"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Prefer": "return=representation",
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(response.status, 201, "Should return 201 Created");
        assertExists(
            response.jsonBody,
            "Response should include the created resource",
        );
    });

    it("HTTP Headers - Location in create response", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Location"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Request should be successful");
        assertEquals(response.status, 201, "Should return 201 Created");
        const location = response.headers.get("Location");
        assertExists(location, "Response should include a Location header");
        assertEquals(
            location?.startsWith(context.getBaseUrl()),
            true,
            "Location should be a full URL",
        );
    });

    it("HTTP Headers - Content-Location in async response", async () => {
        // This test assumes your server supports async operations
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "$process-message",
            method: "POST",
            headers: {
                "Prefer": "respond-async",
            },
            body: JSON.stringify({
                resourceType: "Parameters",
                parameter: [
                    {
                        name: "content",
                        resource: {
                            resourceType: "MessageHeader",
                            event: {
                                system: "http://example.org/message-events",
                                code: "admin-notify",
                            },
                        },
                    },
                ],
            }),
        });

        assertEquals(
            response.status,
            202,
            "Should return 202 Accepted for async operations",
        );
        const contentLocation = response.headers.get("Content-Location");
        assertExists(
            contentLocation,
            "Response should include a Content-Location header",
        );
        assertEquals(
            contentLocation?.startsWith(context.getBaseUrl()),
            true,
            "Content-Location should be a full URL",
        );
    });
}
