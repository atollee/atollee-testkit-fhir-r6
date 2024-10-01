// tests/search/responses/paging_links.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runPagingLinksTests(context: ITestContext) {
    it("Search result bundle should contain paging links when applicable", async () => {
        if (!context.isPaginationSupported()) {
            console.log("Pagination is not supported by this server. Skipping test.");
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5;  // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `PagingTest${i}` });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:contains=PagingTest&_count=${pageSize}`,
        });

        assertEquals(response.success, true, "Search request should be successful");
        
        const bundle = response.jsonBody as Bundle;
        const linkRelations = bundle.link?.map(link => link.relation) || [];

        assertExists(linkRelations.find(rel => rel === "self"), "Bundle should contain a self link");
        assertExists(linkRelations.find(rel => rel === "first"), "Bundle should contain a first link");
        assertExists(linkRelations.find(rel => rel === "next"), "Bundle should contain a next link");
    });

    it("Paging links should be expressed as GET requests", async () => {
        if (!context.isPaginationSupported()) {
            console.log("Pagination is not supported by this server. Skipping test.");
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5;  // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `GetPagingTest${i}` });
        }

        // Perform a POST-based search
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            body: `family:contains=GetPagingTest&_count=${pageSize}`,
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        assertEquals(response.success, true, "POST-based search request should be successful");
        
        const bundle = response.jsonBody as Bundle;
        const pagingLinks = bundle.link?.filter(link => ["first", "next", "last", "prev"].includes(link.relation || "")) || [];

        for (const link of pagingLinks) {
            const linkUrl = new URL(link.url || "");
            assertEquals(linkUrl.pathname.endsWith("Patient"), true, `${link.relation} link should be expressed as a GET-based search`);
            assertExists(linkUrl.searchParams.get("family:contains"), `${link.relation} link should contain the search parameters`);
            assertExists(linkUrl.searchParams.get("_count"), `${link.relation} link should contain the _count parameter`);
        }
    });

    // ... (other tests remain the same)

    it("Should be able to follow 'next' link for pagination", async () => {
        if (!context.isPaginationSupported()) {
            console.log("Pagination is not supported by this server. Skipping test.");
            return;
        }

        const pageSize = context.getDefaultPageSize();
        const totalPatients = pageSize + 5;  // Ensure we have more than one page

        // Create multiple patients to ensure pagination
        for (let i = 0; i < totalPatients; i++) {
            await createTestPatient(context, { family: `FollowNextTest${i}` });
        }

        const firstPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:contains=FollowNextTest&_count=${pageSize}`,
        });

        assertEquals(firstPageResponse.success, true, "First page request should be successful");
        
        const firstPageBundle = firstPageResponse.jsonBody as Bundle;
        const nextLink = firstPageBundle.link?.find(link => link.relation === "next");
        assertExists(nextLink, "First page should contain a next link");

        // Follow the next link
        const secondPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: nextLink.url || "",
        });

        assertEquals(secondPageResponse.success, true, "Second page request should be successful");
        
        const secondPageBundle = secondPageResponse.jsonBody as Bundle;
        assertTrue(secondPageBundle.entry?.length! > 0, "Second page should contain entries");
        assertTrue(secondPageBundle.entry?.length! <= pageSize, "Second page should not exceed the page size");
    });
}