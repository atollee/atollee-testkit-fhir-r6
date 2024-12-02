// tests/search/responses/paging_links.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runPagingLinksTests(context: ITestContext) {
    it("Search result bundle should contain paging links when applicable", async () => {
        if (!context.isPaginationSupported()) {
            console.log(
                "Pagination is not supported by this server. Skipping test.",
            );
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5; // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `PagingTest${i}` });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family:contains=PagingTest&_count=${pageSize}`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const linkRelations = bundle.link?.map((link) => link.relation) || [];

        assertExists(
            linkRelations.find((rel) => rel === "self"),
            "Bundle should contain a self link",
        );
        if (context.isPaginationFirstRelationLinkSupported()) {
            assertExists(
                linkRelations.find((rel) => rel === "first"),
                "Bundle should contain a first link",
            );
        }
        if (context.isPaginationNextRelationLinkSupported()) {
            assertExists(
                linkRelations.find((rel) => rel === "next"),
                "Bundle should contain a next link",
            );
        }
    });

    it("Paging links should be expressed as GET requests", async () => {
        if (!context.isPaginationSupported()) {
            console.log(
                "Pagination is not supported by this server. Skipping test.",
            );
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5; // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `GetPagingTest${i}` });
        }

        // Perform a POST-based search
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            body: `family:contains=GetPagingTest&_count=${pageSize}`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        assertEquals(
            response.success,
            true,
            "POST-based search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const pagingLinks =
            bundle.link?.filter((link) =>
                ["first", "next", "last", "prev"].includes(link.relation || "")
            ) || [];

        for (const link of pagingLinks) {
            const linkUrl = new URL(link.url || "");
            assertEquals(
                linkUrl.searchParams.size > 0,
                true,
                `${link.relation} link should be expressed as a GET-based search`,
            );
        }
    });

    it("Should handle _include correctly with pagination", async () => {
        if (!context.isPaginationSupported()) {
            console.log(
                "Pagination is not supported by this server. Skipping test.",
            );
            return;
        }

        const pageSize = context.getDefaultPageSize();

        // Create a patient with multiple observations
        const patient = await createTestPatient(context, {
            family: "IncludePaginationTest",
        });

        // Create observations for the patient
        const observations = [];
        for (let i = 0; i < pageSize + 3; i++) {
            const obs = await createTestObservation(context, patient.id!, {});
            observations.push(obs);
        }

        // Search observations with _include
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject=${patient.id}&_include=Observation:subject&_count=${pageSize}`,
        });

        assertEquals(
            response.success,
            true,
            "Search with _include should be successful",
        );

        const bundle = response.jsonBody as Bundle;

        // Validate included resources
        const matchEntries = bundle.entry?.filter((e) =>
            e.search?.mode === "match"
        );
        const includeEntries = bundle.entry?.filter((e) =>
            e.search?.mode === "include"
        );

        assertExists(matchEntries, "Bundle should contain match entries");
        assertExists(includeEntries, "Bundle should contain include entries");
        assertEquals(
            includeEntries.length,
            1,
            "Bundle should include the referenced patient once",
        );

        // Follow next link
        const nextLink = bundle.link?.find((link) => link.relation === "next");
        assertExists(nextLink, "Bundle should contain next link");

        const nextPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: nextLink.url,
        });

        assertEquals(
            nextPageResponse.success,
            true,
            "Next page request should be successful",
        );

        const nextPageBundle = nextPageResponse.jsonBody as Bundle;
        const nextPageIncludes = nextPageBundle.entry?.filter((e) =>
            e.search?.mode === "include"
        );

        assertExists(
            nextPageIncludes,
            "Next page should also contain included resources",
        );
        assertEquals(
            nextPageIncludes.length,
            1,
            "Next page should include the referenced patient once",
        );
    });

    it("Should support both GET and POST for initial search with pagination", async () => {
        if (!context.isPaginationSupported()) {
            console.log(
                "Pagination is not supported by this server. Skipping test.",
            );
            return;
        }

        const pageSize = context.getDefaultPageSize();

        for (let i = 0; i < pageSize + 5; i++) {
            // Create test data
            await createTestPatient(context, {
                family: "PaginationMethodTest",
            });
        }

        // Test GET
        const getResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=PaginationMethodTest&_count=${pageSize}`,
            method: "GET",
        });

        assertEquals(
            getResponse.success,
            true,
            "GET search should be successful",
        );

        // Test POST
        const postResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `family=PaginationMethodTest&_count=${pageSize}`,
        });

        assertEquals(
            postResponse.success,
            true,
            "POST search should be successful",
        );

        const getBundle = getResponse.jsonBody as Bundle;
        const postBundle = postResponse.jsonBody as Bundle;

        // Validate next links from both methods are GET requests
        const getNextLink = getBundle.link?.find((link) =>
            link.relation === "next"
        );
        const postNextLink = postBundle.link?.find((link) =>
            link.relation === "next"
        );

        assertExists(getNextLink, "GET response should contain next link");
        assertExists(postNextLink, "POST response should contain next link");

        assertTrue(
            getNextLink.url.startsWith("http"),
            "Next link from GET should be absolute URL",
        );
        assertTrue(
            postNextLink.url.startsWith("http"),
            "Next link from POST should be absolute URL",
        );

        // Following either next link should work with GET
        if (getNextLink.url) {
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: getNextLink.url,
                method: "GET",
            });

            assertEquals(
                nextPageResponse.success,
                true,
                "Following next link with GET should succeed",
            );
        }
    });

    it("Should be able to follow 'next' link for pagination", async () => {
        if (!context.isPaginationSupported()) {
            console.log(
                "Pagination is not supported by this server. Skipping test.",
            );
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5; // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `FollowNextTest${i}` });
        }

        const firstPageResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family:contains=FollowNextTest&_count=${pageSize}`,
        });

        assertEquals(
            firstPageResponse.success,
            true,
            "First page request should be successful",
        );

        const firstPageBundle = firstPageResponse.jsonBody as Bundle;
        const nextLink = firstPageBundle.link?.find((link) =>
            link.relation === "next"
        );
        assertExists(nextLink, "First page should contain a next link");

        // Follow the next link
        const secondPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: nextLink.url || "",
        });

        assertEquals(
            secondPageResponse.success,
            true,
            "Second page request should be successful",
        );

        const secondPageBundle = secondPageResponse.jsonBody as Bundle;
        assertTrue(
            secondPageBundle.entry?.length! > 0,
            "Second page should contain entries",
        );
        assertTrue(
            secondPageBundle.entry?.length! <= pageSize,
            "Second page should not exceed the page size",
        );
    });
}
