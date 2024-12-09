// tests/paging.test.ts

import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runPagingTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();
    it("Paging - Search results", async () => {
        for (let i = 0; i < 10; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=5", // Request 5 results per page
        });

        assertEquals(
            response.status,
            200,
            "Search request should be successful",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );

        // Check if the bundle has the correct number of entries
        assertEquals(
            (bundle.entry?.length ?? 0) <= 5,
            true,
            "Bundle should have 5 or fewer entries",
        );

        // Check for paging links
        assertExists(bundle.link, "Bundle should have navigation links");
        const selfLink = bundle.link.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should have a 'self' link");
        assertExists(selfLink.url, "Self link should have a URL");

        // If there's a next page, check it
        const nextLink = bundle.link.find((link) => link.relation === "next");
        if (nextLink) {
            let nextLinkUrl = nextLink.url!.replace(baseUrl, "");
            if (nextLinkUrl.startsWith("/")) {
                nextLinkUrl = nextLinkUrl.substring(1);
            }
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: nextLinkUrl,
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "Next page request should be successful",
            );
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            assertEquals(
                nextPageBundle.type,
                "searchset",
                "Next page response should be a searchset bundle",
            );

            // Check if the next page has the correct number of entries
            assertTrue(
                nextPageBundle.entry?.length ?? 0 <= 5,
                "Next page bundle should have 5 or fewer entries",
            );

            // Check for previous link in the next page
            const previousLink = nextPageBundle.link?.find((link) =>
                link.relation === "previous"
            );
            assertExists(
                previousLink,
                "Next page should have a 'previous' link",
            );
        }
    });

    it("Paging - History results", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "_history?_count=5", // Request 5 results per page
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "history",
            "Response should be a history bundle",
        );

        // Check if the bundle has the correct number of entries
        assertEquals(
            (bundle.entry?.length ?? 0) <= 5,
            true,
            "Bundle should have 5 or fewer entries",
        );

        // Check for paging links
        assertExists(bundle.link, "Bundle should have navigation links");
        const selfLink = bundle.link.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should have a 'self' link");
        assertExists(selfLink.url, "Self link should have a URL");

        // If there's a next page, check it
        const nextLink = bundle.link.find((link) => link.relation === "next");
        if (nextLink) {
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: nextLink.url!.replace(baseUrl, ""),
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "Next page request should be successful",
            );
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            assertEquals(
                nextPageBundle.type,
                "history",
                "Next page response should be a history bundle",
            );

            // Check if the next page has the correct number of entries
            assertEquals(
                nextPageBundle.entry?.length ?? 0 <= 5,
                true,
                "Next page bundle should have 5 or fewer entries",
            );

            // Check for previous link in the next page
            const previousLink = nextPageBundle.link?.find((link) =>
                link.relation === "previous"
            );
            assertExists(
                previousLink,
                "Next page should have a 'previous' link",
            );
        }
    });

    it("Paging - Total count", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=5&_total=accurate",
        });

        assertEquals(
            response.status,
            200,
            "Search request should be successful",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );

        // Check for total count
        assertExists(bundle.total, "Bundle should have a total count");
        assertEquals(typeof bundle.total, "number", "Total should be a number");
    });

    it("Paging - POST search with continuation", async () => {
        for (let i = 0; i < 10; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }
        // First, perform a POST search
        const initialResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "_count=5",
        });

        assertEquals(
            initialResponse.status,
            200,
            "Initial POST search should be successful",
        );
        const initialBundle = initialResponse.jsonBody as Bundle;

        // If there's a next page, try to access it with GET
        const nextLink = initialBundle.link?.find((link) =>
            link.relation === "next"
        );
        if (nextLink) {
            let nextLinkUrl = nextLink.url!.replace(baseUrl, "");
            if (nextLinkUrl.startsWith("/")) {
                nextLinkUrl = nextLinkUrl.substring(1);
            }
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: nextLinkUrl,
                method: "GET",
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "GET request for next page should be successful",
            );

            // Try to access the same page with POST
            const postNextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: "Patient/_search",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: nextLink.url!.split("?")[1], // Use the query parameters from the next link
            });

            assertEquals(
                postNextPageResponse.status,
                200,
                "POST request for next page should be successful",
            );
            const postNextPageBundle = postNextPageResponse.jsonBody as Bundle;
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            assertEquals(
                postNextPageBundle.entry?.length,
                nextPageBundle.entry?.length,
                "POST and GET requests for the same page should return the same number of results",
            );
        }
    });
}
