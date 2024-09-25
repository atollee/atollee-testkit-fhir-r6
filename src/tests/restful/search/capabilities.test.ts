// tests/capabilities.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { CapabilityStatement, TerminologyCapabilities } from "npm:@types/fhir/r4.d.ts";

export function runCapabilitiesTests(_context: ITestContext) {
    it("Capabilities - Full mode", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(response.success, true, "Capabilities request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Should return a CapabilityStatement resource");
        assertExists(capabilityStatement.software, "Should include software information");
        assertExists(capabilityStatement.implementation, "Should include implementation information");
        assertExists(capabilityStatement.fhirVersion, "Should include FHIR version");
        assertExists(capabilityStatement.rest, "Should include REST capabilities");
    });

    it("Capabilities - Normative mode", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata?mode=normative",
        });

        assertEquals(response.success, true, "Normative capabilities request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Should return a CapabilityStatement resource");
        // Add more specific checks for normative content if needed
    });

    it("Capabilities - Terminology mode", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata?mode=terminology",
        });

        assertEquals(response.success, true, "Terminology capabilities request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const terminologyCapabilities = response.jsonBody as TerminologyCapabilities;
        assertEquals(terminologyCapabilities.resourceType, "TerminologyCapabilities", "Should return a TerminologyCapabilities resource");
        assertExists(terminologyCapabilities.codeSystem, "Should include code system information");
    });

    it("Capabilities - ETag header", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(response.success, true, "Capabilities request should be successful");
        assertExists(response.headers.get("ETag"), "Response should include an ETag header");
    });

    it("Capabilities - Specific FHIR version", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
            headers: {
                "Accept": "application/fhir+json; fhirVersion=4.0",
            },
        });

        assertEquals(response.success, true, "Capabilities request for specific FHIR version should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.fhirVersion, "4.0.1", "Should return capabilities for FHIR R4");
    });

    it("Capabilities - Summary parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata?_summary=true",
        });

        assertEquals(response.success, true, "Capabilities request with summary parameter should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Should return a CapabilityStatement resource");
        // Check that the response is indeed a summary (fewer fields than a full response)
        assertEquals(Object.keys(capabilityStatement).length < 10, true, "Summary should include limited fields");
    });

    it("Capabilities - Elements parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata?_elements=software,fhirVersion",
        });

        assertEquals(response.success, true, "Capabilities request with elements parameter should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Should return a CapabilityStatement resource");
        assertExists(capabilityStatement.software, "Should include software information");
        assertExists(capabilityStatement.fhirVersion, "Should include FHIR version");
        assertEquals(Object.keys(capabilityStatement).length, 3, "Should only include specified elements plus resourceType");
    });

    it("Capabilities - Unsupported FHIR version", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
            headers: {
                "Accept": "application/fhir+json; fhirVersion=1.0",
            },
        });

        assertEquals(response.success, false, "Capabilities request for unsupported FHIR version should fail");
        assertEquals(response.status, 406, "Should return 406 Not Acceptable for unsupported FHIR version");
    });
}
