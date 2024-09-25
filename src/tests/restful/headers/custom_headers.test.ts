// tests/custom_headers.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotExists,
    it,
} from "../../../../deps.test.ts";

export function runCustomHeadersTests(_context: ITestContext) {
    it("Custom Headers - X-Request-Id", async () => {
        const clientRequestId = "client-request-" + Date.now();
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Request-Id": clientRequestId,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        assertExists(
            response.headers.get("X-Request-Id"),
            "Response should include X-Request-Id header",
        );

        const serverRequestId = response.headers.get("X-Request-Id");
        if (serverRequestId !== clientRequestId) {
            assertExists(
                response.headers.get("X-Correlation-Id"),
                "Response should include X-Correlation-Id when server uses different request id",
            );
            assertEquals(
                response.headers.get("X-Correlation-Id"),
                clientRequestId,
                "X-Correlation-Id should match client's X-Request-Id",
            );
        }
    });

    it("Custom Headers - X-Forwarded-For", async () => {
        const forwardedIp = "192.0.2.60";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Forwarded-For": forwardedIp,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        // Note: The server might not echo back this header, so we're just checking if the request was successful
    });

    it("Custom Headers - X-Forwarded-Host", async () => {
        const forwardedHost = "example.com";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Forwarded-Host": forwardedHost,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        // Note: The server might not echo back this header, so we're just checking if the request was successful
    });

    it("Custom Headers - X-Intermediary", async () => {
        const intermediary = "test-intermediary.example.com";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Intermediary": intermediary,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        assertNotExists(
            response.headers.get("X-Intermediary"),
            "Server should not use X-Intermediary header in response",
        );
    });

    it("Custom Headers - X-Forwarded-Proto", async () => {
        const forwardedProto = "https";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Forwarded-Proto": forwardedProto,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        // Note: The server might not echo back this header, so we're just checking if the request was successful
    });

    it("Custom Headers - X-Forwarded-Port", async () => {
        const forwardedPort = "443";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Forwarded-Port": forwardedPort,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        // Note: The server might not echo back this header, so we're just checking if the request was successful
    });

    it("Custom Headers - X-Forwarded-Prefix", async () => {
        const forwardedPrefix = "/fhir";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            headers: {
                "X-Forwarded-Prefix": forwardedPrefix,
            },
        });

        assertEquals(response.status, 200, "Request should be successful");
        // Note: The server might not echo back this header, so we're just checking if the request was successful
    });
}
