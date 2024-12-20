// tests/head_support.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotExists,
    it,
} from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runHeadSupportTests(context: ITestContext) {
    it("HEAD - Read interaction", async () => {
        const validPatient = await createTestPatient(context);
        const patientId = validPatient.id;
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "GET",
        });

        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "HEAD",
        });

        assertEquals(
            headResponse.status,
            getResponse.status,
            "HEAD and GET should return the same status code",
        );
        assertExists(
            headResponse.headers.get("Content-Type"),
            "HEAD response should include Content-Type header",
        );
        assertEquals(
            headResponse.headers.get("Content-Type"),
            getResponse.headers.get("Content-Type"),
            "Content-Type headers should match",
        );
        assertExists(
            headResponse.headers.get("ETag"),
            "HEAD response should include ETag header",
        );
        assertEquals(
            headResponse.headers.get("ETag"),
            getResponse.headers.get("ETag"),
            "ETag headers should match",
        );
        assertNotExists(
            headResponse.jsonBody,
            "HEAD response should not include a body",
        );
    });

    it("HEAD - Search interaction", async () => {
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=test",
            method: "GET",
        });

        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=test",
            method: "HEAD",
        });

        assertEquals(
            headResponse.status,
            getResponse.status,
            "HEAD and GET should return the same status code",
        );
        assertExists(
            headResponse.headers.get("Content-Type"),
            "HEAD response should include Content-Type header",
        );
        assertEquals(
            headResponse.headers.get("Content-Type"),
            getResponse.headers.get("Content-Type"),
            "Content-Type headers should match",
        );
        assertNotExists(
            headResponse.jsonBody,
            "HEAD response should not include a body",
        );
    });

    it("HEAD - History interaction", async () => {
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_history",
            method: "GET",
        });

        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_history",
            method: "HEAD",
        });

        assertEquals(
            headResponse.status,
            getResponse.status,
            "HEAD and GET should return the same status code",
        );
        assertExists(
            headResponse.headers.get("Content-Type"),
            "HEAD response should include Content-Type header",
        );
        assertEquals(
            headResponse.headers.get("Content-Type"),
            getResponse.headers.get("Content-Type"),
            "Content-Type headers should match",
        );
        assertNotExists(
            headResponse.jsonBody,
            "HEAD response should not include a body",
        );
    });

    it("HEAD - Capabilities interaction", async () => {
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
            method: "GET",
        });

        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
            method: "HEAD",
        });

        assertEquals(
            headResponse.status,
            getResponse.status,
            "HEAD and GET should return the same status code",
        );
        assertExists(
            headResponse.headers.get("Content-Type"),
            "HEAD response should include Content-Type header",
        );
        assertEquals(
            headResponse.headers.get("Content-Type"),
            getResponse.headers.get("Content-Type"),
            "Content-Type headers should match",
        );
        assertNotExists(
            headResponse.jsonBody,
            "HEAD response should not include a body",
        );
    });

    it("HEAD - Unsupported interaction", async () => {
        const headResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "HEAD",
        });

        // The server should either support HEAD or return an appropriate error code
        if (headResponse.status !== 200) {
            assertEquals(
                [405, 501].includes(headResponse.status),
                true,
                "Unsupported HEAD should return either 405 Method Not Allowed or 501 Not Implemented",
            );
        }
    });
}
