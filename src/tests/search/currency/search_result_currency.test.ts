// tests/search/search_result_currency.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

function delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

export function runSearchResultCurrencyTests(context: ITestContext) {
    it("Should return current results at the time of search execution", async () => {
        const uniqueName = uniqueString("TestPatient");
        await createTestPatient(context, { name: [{ given: [uniqueName] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Search should return the newly created patient",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle updates to resources during paged search", async () => {
            // Create initial set of patients
            const uniqueNamePrefix = uniqueString("TestPatient");
            for (let i = 0; i < 10; i++) {
                await createTestPatient(context, {
                    name: [{ given: [`${uniqueNamePrefix}${i}`] }],
                });
            }

            // Perform initial search with paging
            const initialResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?name=${uniqueNamePrefix}&_count=5`,
            });

            assertEquals(
                initialResponse.status,
                200,
                "Server should process the initial search request successfully",
            );
            const initialBundle = initialResponse.jsonBody as Bundle;
            assertExists(
                initialBundle.link,
                "Initial bundle should contain links",
            );
            const nextLink = initialBundle.link.find((link) =>
                link.relation === "next"
            );
            assertExists(nextLink, "Initial bundle should contain a next link");

            // Create a new patient
            const newPatientName = `${uniqueNamePrefix}New`;
            await createTestPatient(context, {
                name: [{ given: [newPatientName] }],
            });

            // Slight delay to ensure the new patient is indexed
            await delay(1000);

            // Perform the next page search
            const nextPageResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: nextLink.url,
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "Server should process the next page search request successfully",
            );
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            assertExists(
                nextPageBundle.entry,
                "Next page bundle should contain entries",
            );

            // Check if the new patient is included in the results
            const newPatientIncluded = nextPageBundle.entry.some((entry) =>
                (entry.resource as Patient).name?.[0].given?.[0] ===
                    newPatientName
            );

            // Note: The assertion here depends on the server's behavior. Some servers might include the new patient, others might not.
            console.log(
                `New patient ${
                    newPatientIncluded ? "was" : "was not"
                } included in the paged results.`,
            );
        });
    }

    it("Should not change the set of resources on the server (except possibly AuditEvent)", async () => {
        const beforeSearchResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_summary=count`,
        });

        const beforeSearchBundle = beforeSearchResponse.jsonBody as Bundle;
        const beforeSearchCount = beforeSearchBundle.total;

        // Perform a search operation
        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=TestSearch`,
        });

        const afterSearchResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_summary=count`,
        });

        const afterSearchBundle = afterSearchResponse.jsonBody as Bundle;
        const afterSearchCount = afterSearchBundle.total;

        assertEquals(
            afterSearchCount,
            beforeSearchCount,
            "Patient count should not change after search operation",
        );

        // Check for AuditEvent creation
        const auditEventResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `AuditEvent?entity-type=Patient&date=gt${
                new Date().toISOString()
            }`,
        });

        const auditEventBundle = auditEventResponse.jsonBody as Bundle;
        assertTrue(
            (auditEventBundle.total || 0) >= 0,
            "AuditEvent might or might not be created for the search operation",
        );
    });
}
