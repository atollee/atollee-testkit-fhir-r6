// tests/security.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { extractErrorMessage } from "../../utils/error.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runSecurityTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();
    it("Security - HTTPS Usage", async () => {
        await fetchWrapper({
            authorized: false,
            relativeUrl: "metadata",
        });
        assertEquals(
            baseUrl.startsWith("https://"),
            true,
            "Production server should use HTTPS",
        );
    });

    it("Security - SSL Certificate Validity", async () => {
        try {
            const response = await fetchWrapper({
                authorized: false,
                relativeUrl: "metadata",
            });
            assertEquals(
                response.success,
                true,
                "SSL certificate should be valid",
            );
        } catch (error) {
            throw new Error(
                `SSL certificate validation failed: ${
                    extractErrorMessage(error)
                }`,
            );
        }
    });

    it("Security - CORS Support", async () => {
        const response = await fetchWrapper({
            authorized: false,
            relativeUrl: "",
            method: "OPTIONS",
            headers: {
                "Origin": "https://example.com",
                "Access-Control-Request-Method": "GET",
            },
        });

        assertEquals(
            response.success,
            true,
            "OPTIONS request should be successful",
        );
        assertExists(
            response.headers.get("Access-Control-Allow-Origin"),
            "Server should respond with Access-Control-Allow-Origin header",
        );
        assertExists(
            response.headers.get("Access-Control-Allow-Methods"),
            "Server should respond with Access-Control-Allow-Methods header",
        );
    });

    if (context.isAuthorizedSupported()) {
        it("Security - Authentication Required", async () => {
            const patient = await createTestPatient(context);
            const validPatientId = patient.id;

            const unauthenticatedResponse = await fetchWrapper({
                authorized: false,
                relativeUrl: `Patient/${validPatientId}`,
            });

            // deno-lint-ignore no-explicit-any
            const body = unauthenticatedResponse.jsonBody as any;
            assertEquals(
                unauthenticatedResponse.success,
                false,
                "Unauthenticated request should fail",
            );
            assertEquals(
                body.issue?.[0]?.code,
                "security",
                "Error should indicate a security issue",
            );
            assertEquals(
                unauthenticatedResponse.status,
                401,
                "Http Response should indicate authentication error",
            );

            const authenticatedResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient/${validPatientId}`,
            });

            assertEquals(
                authenticatedResponse.success,
                true,
                "Authenticated request should succeed",
            );
        });
    }
}
