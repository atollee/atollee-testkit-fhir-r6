// tests/search.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";

export function runSearchTests(context: ITestContext) {
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

        assertEquals(
            response.success,
            true,
            "Server root search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
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

        assertEquals(
            response.success,
            true,
            "Resource type search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertEquals(
            bundle.entry?.every((e) => e.resource?.resourceType === "Patient"),
            true,
            "All entries should be Patient resources",
        );
    });

    it("Search - Compartment POST Searches", async () => {
        // Create test data first
        const patient = await createTestPatient(context, {
            name: [{ family: "TestCompartmentPatient" }],
        });
        const observation = await createTestObservation(context, patient.id!, {
            subject: {
                reference: `Patient/${patient.id}`,
            },
        });

        // Test 1: Search all resources in patient compartment
        const allResourcesResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_count=5",
        });

        assertEquals(
            allResourcesResponse.status,
            200,
            "Search for all resources in compartment should return 200",
        );
        const allResourcesBundle = allResourcesResponse.jsonBody as Bundle;
        assertEquals(
            allResourcesBundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertExists(allResourcesBundle.entry, "Bundle should contain entries");

        // Test 2: Search specific resource type in patient compartment
        const specificTypeResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/Observation/_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_count=5",
        });

        assertEquals(
            specificTypeResponse.status,
            200,
            "Search for specific resource type in compartment should return 200",
        );
        const specificTypeBundle = specificTypeResponse.jsonBody as Bundle;
        assertEquals(
            specificTypeBundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertExists(specificTypeBundle.entry, "Bundle should contain entries");

        // Test 3: Verify search results contain appropriate resources
        if (specificTypeBundle.entry) {
            const foundObservation = specificTypeBundle.entry.some((entry) =>
                entry.resource?.resourceType === "Observation" &&
                entry.resource.id === observation.id
            );
            assertEquals(
                foundObservation,
                true,
                "Compartment search should return resources belonging to the compartment",
            );
        }

        // Test 4: Verify self link includes search parameters
        assertExists(specificTypeBundle.link, "Bundle should contain links");
        const selfLink = specificTypeBundle.link.find((link) =>
            link.relation === "self"
        );
        assertExists(selfLink, "Bundle should contain self link");
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

        assertEquals(
            response.success,
            true,
            "Compartment and resource type search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertEquals(
            bundle.entry?.every((e) =>
                e.resource?.resourceType === "Observation"
            ),
            true,
            "All entries should be Observation resources",
        );
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

        assertEquals(
            response.success,
            true,
            "Search with query parameters should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
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

        assertEquals(
            response.success,
            false,
            "Search with invalid parameters should fail",
        );
        assertEquals(
            response.status,
            400,
            "Should return 400 Bad Request for invalid parameters",
        );
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

        assertEquals(
            response.success,
            false,
            "Search with unsupported _format should fail",
        );
        assertEquals(
            response.status,
            406,
            "Should return 406 Not Acceptable for unsupported _format",
        );
    });
}
