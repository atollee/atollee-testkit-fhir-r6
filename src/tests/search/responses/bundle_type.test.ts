// tests/search/responses/bundle_type.test.ts

import { assertEquals, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runBundleTypeTests(context: ITestContext) {
    it("Search result bundle should have type 'searchset'", async () => {
        // Create a test patient to ensure we have at least one search result
        await createTestPatient(context, { family: "BundleTypeTest" });

        // Perform a search
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=BundleTypeTest",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Bundle type should be 'searchset'",
        );
    });

    it("Empty search result should still return a bundle with type 'searchset'", async () => {
        // Perform a search that's unlikely to return results
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=NonexistentFamilyName12345",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful even with no results",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Bundle type should be 'searchset' even for empty results",
        );
        assertEquals(bundle.total, 0, "Total should be 0 for empty results");
    });

    if (context.isMultiTypeSearchSupported()) {
        it("Search across multiple resource types should only allow common search parameters", async () => {
            // Create test resources
            const patient = await createTestPatient(context, {
                family: "MultiTypeSearchTest" + Date.now(),
            });

            await createTestObservation(context, patient.id!, {});

            // Test valid multi-type search with common parameter (_id, _lastUpdated etc.)
            const validResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: "_search",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `_type=Patient,Observation&_lastUpdated=gt2020-01-01`,
            });

            assertEquals(validResponse.status, 200);

            // Test invalid multi-type search with non-common parameter
            const invalidResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: "_search",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `_type=Patient,Observation&family=TestFamily`,
            });

            assertEquals(
                invalidResponse.status,
                400,
                "Server should return 400 when using parameters not common to all specified types",
            );
        });
    }
}
