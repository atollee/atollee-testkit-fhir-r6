// tests/conditional-read.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runConditionalReadTests(context: ITestContext) {
    it("Conditional Read - If-Modified-Since with unchanged resource", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        // First, get the current resource and its Last-Modified date
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const lastModified = initialResponse.headers.get("Last-Modified");
        assertExists(
            lastModified,
            "Initial response should include a Last-Modified header",
        );

        // Now, perform a conditional read with the same Last-Modified date
        const conditionalResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "If-Modified-Since": lastModified,
            },
        });

        assertEquals(
            conditionalResponse.status === 304 ||
                conditionalResponse.status === 200,
            true,
            "Server should return either 304 Not Modified or 200 OK with full content",
        );

        if (conditionalResponse.status === 304) {
            assertEquals(
                conditionalResponse.jsonBody,
                null,
                "304 response should have no body",
            );
        } else {
            assertExists(
                conditionalResponse.jsonBody,
                "200 response should include full content",
            );
        }
    });

    it("Conditional Read - If-Modified-Since with changed resource", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const lastModified = initialResponse.headers.get("Last-Modified");

        const pastModifiedTime = lastModified
            ? new Date(lastModified).getTime()
            : Date.now();

        // Use a date in the past to ensure the resource has been modified since then
        const pastDate = new Date(pastModifiedTime - 86400000).toUTCString(); // 24 hours ago

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "If-Modified-Since": pastDate,
            },
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK with full content for modified resource",
        );
        assertExists(response.jsonBody, "Response should include full content");
    });

    it("Conditional Read - If-None-Match with matching ETag", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        // First, get the current resource and its ETag
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const etag = initialResponse.headers.get("ETag");
        assertExists(etag, "Initial response should include an ETag header");

        // Now, perform a conditional read with the same ETag
        const conditionalResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "If-None-Match": etag,
            },
        });

        assertEquals(
            conditionalResponse.status === 304 ||
                conditionalResponse.status === 200,
            true,
            "Server should return either 304 Not Modified or 200 OK with full content",
        );

        if (conditionalResponse.status === 304) {
            assertTrue(
                conditionalResponse.jsonBody === null ||
                    conditionalResponse.jsonBody === undefined,
                "304 response should have no body",
            );
        } else {
            assertExists(
                conditionalResponse.jsonBody,
                "200 response should include full content",
            );
        }
    });

    it("Conditional Read - If-None-Match with non-matching ETag", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        const nonMatchingEtag = 'W/"non-matching-etag"';

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "If-None-Match": nonMatchingEtag,
            },
        });

        assertEquals(
            response.status,
            200,
            "Server should return 200 OK with full content for non-matching ETag",
        );
        assertExists(response.jsonBody, "Response should include full content");
    });

    it("Conditional Read - Server handles both If-Modified-Since and If-None-Match", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
        // First, get the current resource, its ETag, and Last-Modified date
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const etag = initialResponse.headers.get("ETag");
        const lastModified = initialResponse.headers.get("Last-Modified");
        assertExists(etag, "Initial response should include an ETag header");
        assertExists(
            lastModified,
            "Initial response should include a Last-Modified header",
        );

        // Now, perform a conditional read with both headers
        const conditionalResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "If-Modified-Since": lastModified,
                "If-None-Match": etag,
            },
        });

        assertEquals(
            conditionalResponse.status === 304 ||
                conditionalResponse.status === 200,
            true,
            "Server should return either 304 Not Modified or 200 OK with full content",
        );

        if (conditionalResponse.status === 304) {
            assertTrue(
                conditionalResponse.jsonBody === null ||
                    conditionalResponse.jsonBody === undefined,
                "304 response should have no body",
            );
        } else {
            assertExists(
                conditionalResponse.jsonBody,
                "200 response should include full content",
            );
        }
    });
}
