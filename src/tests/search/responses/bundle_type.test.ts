// tests/search/responses/bundle_type.test.ts

import { assertEquals, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestObservation, createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runBundleTypeTests(context: ITestContext) {
    it("Search result bundle should have type 'searchset'", async () => {
        // Create a test patient to ensure we have at least one search result
        await createTestPatient(context, { family: "BundleTypeTest" });

        // Perform a search
        const response = await fetchWrapper({
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
        const response = await fetchWrapper({
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

    it("Search across multiple resource types should return a bundle with type 'searchset'", async () => {
        // Create a test patient to ensure we have at least one search result
        const patient = await createTestPatient(context, {
            family: "MultiTypeSearchTest",
        });

        // Create a test observation for this patient
        await createTestObservation(context, patient.id!, {
            code: "multi-type-search-test",
        });

        // Perform a search across multiple resource types
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                "?_type=Patient,Observation&_content=MultiTypeSearchTest",
        });

        assertEquals(
            response.success,
            true,
            "Multi-type search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Bundle type should be 'searchset' for multi-type search",
        );
        assertEquals(
            bundle.entry!.length > 1,
            true,
            "Should have multiple entries for multi-type search",
        );
    });
}
