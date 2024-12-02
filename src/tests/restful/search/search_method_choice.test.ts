// tests/search_method_choice.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { Bundle, OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runSearchMethodChoiceTests(context: ITestContext) {
    it("Search - GET and POST methods both supported", async () => {
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        const postResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(
            getResponse.success,
            true,
            "GET search should be successful",
        );
        assertEquals(
            postResponse.success,
            true,
            "POST search should be successful",
        );
        assertEquals(getResponse.status, 200, "GET should return 200 OK");
        assertEquals(postResponse.status, 200, "POST should return 200 OK");
    });

    it("Search - Handling paged result sets", async () => {
        // Create unique identifier for test data
        const testFamily = `LargeTest${Date.now()}`;
        const requestedCount = 5; // Small page size to ensure pagination
        const totalPatients = requestedCount + 3; // Create more than one page worth

        // Create test patients
        for (let i = 0; i < totalPatients; i++) {
            const response = await createTestPatient(context, {
                family: testFamily,
            });
            assertTrue(response, "patient was successfully created");
        }

        // Search with small page size to force pagination
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${testFamily}&_count=${requestedCount}`,
        });

        assertEquals(
            response.success,
            true,
            "Large result set search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;

        // Verify total count
        assertExists(bundle.total, "Bundle should have total count");
        assertEquals(
            bundle.total,
            totalPatients,
            "Total should match number of created patients",
        );

        // Verify page size
        assertExists(bundle.entry, "Bundle should have entries");
        assertEquals(
            bundle.entry.length,
            requestedCount,
            "Page size should match requested count",
        );

        // Verify pagination links
        assertExists(bundle.link, "Bundle should have links");
        const nextLink = bundle.link.find((link) => link.relation === "next");
        assertExists(
            nextLink,
            "Should have next link for pagination since there are more results",
        );

        // Verify self link
        const selfLink = bundle.link.find((link) => link.relation === "self");
        assertExists(selfLink, "Should have self link");

        // Verify next page content
        if (nextLink) {
            let nextLinkUrl = nextLink.url.replace(context.getBaseUrl(), "");
            if (nextLinkUrl.startsWith("/")) {
                nextLinkUrl = nextLinkUrl.substring(1);
            }
            const nextResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: nextLinkUrl,
            });

            assertEquals(
                nextResponse.success,
                true,
                "Next page request should be successful",
            );
            const nextBundle = nextResponse.jsonBody as Bundle;
            assertExists(nextBundle.entry, "Next page should have entries");
            assertEquals(
                nextBundle.entry.length,
                totalPatients - requestedCount,
                "Next page should contain remaining patients",
            );
        }
    });

    it("Search - OperationOutcome in searchset", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        assertEquals(response.success, true, "Search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const operationOutcome = bundle.entry?.find((entry) =>
            entry.resource?.resourceType === "OperationOutcome"
        );
        if (operationOutcome) {
            assertEquals(
                operationOutcome.search?.mode,
                "outcome",
                "OperationOutcome should have search mode 'outcome'",
            );
            const issues =
                (operationOutcome.resource as OperationOutcome).issue || [];
            assertEquals(
                issues.every((issue) =>
                    issue.severity !== "error" && issue.severity !== "fatal"
                ),
                true,
                "OperationOutcome should not contain error or fatal issues",
            );
        }
    });

    it("Search - Failure with 4xx status code", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?invalid_param=value",
        });

        assertEquals(
            response.success,
            false,
            "Search with invalid parameter should fail",
        );
        assertEquals(
            response.status >= 400 && response.status < 500,
            true,
            "Should return a 4xx status code",
        );
        assertExists(response.jsonBody, "Should return an OperationOutcome");
        assertEquals(
            response.jsonBody.resourceType,
            "OperationOutcome",
            "Should return an OperationOutcome resource",
        );
    });

    it("Search - Unauthorized access", async () => {
        const response = await fetchWrapper({
            authorized: false, // Explicitly not authorizing this request
            relativeUrl: "Patient?name=Test",
        });

        assertEquals(
            response.success,
            false,
            "Unauthorized search should fail",
        );
        assertEquals(response.status, 401, "Should return 401 Unauthorized");
    });

    it("Search - Unsupported resource type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedResource?param=value",
        });

        assertEquals(
            response.success,
            false,
            "Search for unsupported resource type should fail",
        );
        assertEquals(response.status, 404, "Should return 404 Not Found");
    });

    it("Search - Method not allowed", async () => {
        // This test assumes your server might restrict one of GET or POST for search
        // Adjust as necessary based on your server's behavior
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        const postResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(
            getResponse.status === 405 && postResponse.status === 405,
            false,
            "One of GET or POST should return 405 Method Not Allowed",
        );
        assertEquals(
            getResponse.status === 200 || postResponse.status === 200,
            true,
            "The other method should be successful",
        );
    });
}
