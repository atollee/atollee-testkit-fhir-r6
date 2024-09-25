// tests/search.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, it } from "../../../../deps.test.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";

export function runSearchTests(_context: ITestContext) {
    it("Search - Server Root POST", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_count=10",
        });

        assertEquals(response.success, true, "Server root search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful search");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.type, "searchset", "Response should be a searchset bundle");
    });

    it("Search - Resource Type POST", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(response.success, true, "Resource type search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful search");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.type, "searchset", "Response should be a searchset bundle");
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Patient"), true, "All entries should be Patient resources");
    });

    it("Search - Compartment POST", async () => {
        // Assuming we have a valid patient ID for the compartment
        const patientId = "example-patient-id";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}/_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_count=5",
        });

        assertEquals(response.success, true, "Compartment search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful search");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.type, "searchset", "Response should be a searchset bundle");
    });

    it("Search - Compartment and Resource Type POST", async () => {
        // Assuming we have a valid patient ID for the compartment
        const patientId = "example-patient-id";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}/Observation/_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "code=http://loinc.org|55284-4",
        });

        assertEquals(response.success, true, "Compartment and resource type search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful search");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.type, "searchset", "Response should be a searchset bundle");
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Observation"), true, "All entries should be Observation resources");
    });

    it("Search - POST with query parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search?_format=json",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(response.success, true, "Search with query parameters should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for successful search");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.type, "searchset", "Response should be a searchset bundle");
    });

    it("Search - POST with invalid parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "invalid_param=value",
        });

        assertEquals(response.success, false, "Search with invalid parameters should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request for invalid parameters");
    });

    it("Search - POST with unsupported _format", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_format=unsupported_format",
        });

        assertEquals(response.success, false, "Search with unsupported _format should fail");
        assertEquals(response.status, 406, "Should return 406 Not Acceptable for unsupported _format");
    });
}
