// tests/identity.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

// 3.2.0.1.2 Service Base URL (identity part)
export function runServiceBaseUrlIdentityTests(context: ITestContext) {
    it("Identity - Query Parameter Ignored", async () => {
        const patient = await createTestPatient(context);
        const responseWithoutQuery = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
        });

        const responseWithQuery = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_format=json`,
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
        const patient = await createTestPatient(context);
        const patientId = patient.id;
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
        const patient = await createTestPatient(context);
        const patientId = patient.id;
        const baseUrl = context.getBaseUrl();
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
}
