// tests/identity.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals, assertTrue,
    it
} from "../../../../deps.test.ts";

// 3.2.0.1.2 Service Base URL (identity part)
export function runServiceBaseUrlIdentityTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();
    const patientId = context.getValidPatientId(); // Use a known patient ID for testing

    it("Identity - Query Parameter Ignored", async () => {
        const responseWithoutQuery = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const responseWithQuery = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}?_format=json`,
        });

        assertEquals(
            responseWithoutQuery.success,
            true,
            "Request without query should be successful",
        );
        assertEquals(
            responseWithQuery.success,
            true,
            "Request with query should be successful",
        );

        const patientWithoutQuery = responseWithoutQuery.jsonBody as Patient;
        const patientWithQuery = responseWithQuery.jsonBody as Patient;

        assertEquals(
            patientWithoutQuery.id,
            patientWithQuery.id,
            "Patient IDs should match regardless of query parameters",
        );
        assertEquals(
            patientWithoutQuery.meta?.versionId,
            patientWithQuery.meta?.versionId,
            "Version IDs should match regardless of query parameters",
        );
    });

    it("Identity - Case Sensitivity", async () => {
        const lowerCaseResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `patient/${patientId}`,
        });

        const upperCaseResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        assertEquals(
            lowerCaseResponse.success,
            false,
            "Lowercase 'patient' should not be successful",
        );
        assertEquals(
            upperCaseResponse.success,
            true,
            "Uppercase 'Patient' should be successful",
        );
    });

    it("Identity - HTTP and HTTPS Protocols", async () => {
        // Note: This test assumes your server supports both HTTP and HTTPS
        // You may need to adjust this based on your server configuration
        const httpResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            overrideBaseUrl: baseUrl.replace("https://", "http://"),
        });

        const httpsResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        if (context.isHttpSupported()) {
            assertEquals(
                httpResponse.success,
                true,
                "HTTP request should be successful",
            );
        }
        assertEquals(
            httpsResponse.success,
            true,
            "HTTPS request should be successful",
        );

        const httpPatient = httpResponse.jsonBody as Patient;
        const httpsPatient = httpsResponse.jsonBody as Patient;

        if (context.isHttpSupported()) {
            assertEquals(
                httpPatient.id,
                httpsPatient.id,
                "Patient IDs should match for HTTP and HTTPS",
            );
            assertEquals(
                httpPatient.meta?.versionId,
                httpsPatient.meta?.versionId,
                "Version IDs should match for HTTP and HTTPS",
            );
        } else {
            assertTrue(true, "only https is supported");
        }
    });
    /*
    // To discuss whether this test make sense in practice
    it("Identity - Different Ports", async () => {
        // Note: This test assumes your server is available on different ports
        // You may need to adjust this based on your server configuration
        const defaultPortResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const alternatePortResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            overrideBaseUrl: baseUrl.replace(/:443/, ":8443"), // Assuming default HTTPS port is 443
        });

        assertEquals(
            defaultPortResponse.success,
            true,
            "Request to default port should be successful",
        );
        assertEquals(
            alternatePortResponse.success,
            true,
            "Request to alternate port should be successful",
        );

        const defaultPortPatient = defaultPortResponse.jsonBody as Patient;
        const alternatePortPatient = alternatePortResponse.jsonBody as Patient;

        assertNotEquals(
            defaultPortPatient.id,
            alternatePortPatient.id,
            "Patient IDs should be different for different ports",
        );
    });
    */
}
