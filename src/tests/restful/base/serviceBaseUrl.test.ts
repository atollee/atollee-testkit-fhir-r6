// tests/service-base-url.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, it } from "../../../../deps.test.ts";

// 3.2.0.1.2 Service Base URL (without identity)
export function runServiceBaseUrlTests(_context: ITestContext) {
    it("Service Base URL - Resource Type Access", async () => {
        const resourceTypes = ["Patient", "Observation", "Encounter"];

        for (const resourceType of resourceTypes) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `${resourceType}`,
            });

            assertEquals(response.success, true, `Request to /${resourceType} should be successful`);
            assertEquals(response.jsonParsed, true, `Response from /${resourceType} should be valid JSON`);

            const bundle = response.jsonBody as Bundle;
            assertEquals(bundle.resourceType, "Bundle", `Response from /${resourceType} should be a Bundle`);
        }
    });

    it("Service Base URL - Case Sensitivity", async () => {
        const lowerCaseResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "patient",
        });

        const upperCaseResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
        });

        assertEquals(lowerCaseResponse.success, false, "Lowercase 'patient' should not be successful");
        assertEquals(upperCaseResponse.success, true, "Uppercase 'Patient' should be successful");
    });

    it("Service Base URL - Trailing Slash Handling", async () => {
        const withoutSlashResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
        });

        const withSlashResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/",
        });

        assertEquals(withoutSlashResponse.success, true, "Request without trailing slash should be successful");
        assertEquals(withSlashResponse.success, true, "Request with trailing slash should be successful");

        // Check if the responses are equivalent (same number of entries, same total)
        const withoutSlashBundle = withoutSlashResponse.jsonBody as Bundle;
        const withSlashBundle = withSlashResponse.jsonBody as Bundle;

        assertEquals(withoutSlashBundle.total, withSlashBundle.total, "Total should be the same with or without trailing slash");
        assertEquals(withoutSlashBundle.entry?.length, withSlashBundle.entry?.length, "Number of entries should be the same with or without trailing slash");
    });

    it("Service Base URL - UTF-8 Encoding", async () => {
        const utf8EncodedResourceName = encodeURIComponent("Patiënt");
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: utf8EncodedResourceName,
        });

        assertEquals(response.success, false, "UTF-8 encoded non-standard resource name should not be successful");
    });
}