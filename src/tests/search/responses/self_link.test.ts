// tests/search/responses/self_link.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSelfLinkTests(context: ITestContext) {
    it("Search result bundle should contain a self link", async () => {
        await createTestPatient(context, { family: "SelfLinkTest" });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=SelfLinkTest",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertExists(selfLink.url, "Self link should have a URL");
    });

    it("Self link should contain all used search parameters", async () => {
        await createTestPatient(context, {
            family: "ParameterTest",
            gender: "male",
        });

        const searchParams = "family=ParameterTest&gender=male&_count=10";
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?${searchParams}`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertExists(selfLink.url, "Self link should have a URL");

        const selfLinkUrl = new URL(selfLink.url);
        for (const [key, value] of new URLSearchParams(searchParams)) {
            assertEquals(
                selfLinkUrl.searchParams.get(key),
                value,
                `Self link should contain the search parameter: ${key}`,
            );
        }
    });

    it("Self link should be expressed as an HTTP GET-based search", async () => {
        await createTestPatient(context, { family: "GetBasedTest" });

        // Perform a POST-based search
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            body: "family=GetBasedTest",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        assertEquals(
            response.success,
            true,
            "POST-based search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertExists(selfLink.url, "Self link should have a URL");

        const selfLinkUrl = new URL(selfLink.url);
        assertEquals(
            selfLinkUrl.pathname.endsWith("Patient"),
            true,
            "Self link should be expressed as a GET-based search",
        );
        assertEquals(
            selfLinkUrl.searchParams.get("family"),
            "GetBasedTest",
            "Self link should contain the search parameter",
        );
    });

    it("Self link may be absolute or relative URI", async () => {
        await createTestPatient(context, { family: "UriTest" });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=UriTest",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        const selfLink = bundle.link?.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertExists(selfLink.url, "Self link should have a URL");

        // Check if the URL is absolute or relative
        const isAbsolute = selfLink.url.startsWith("http://") ||
            selfLink.url.startsWith("https://");
        const isRelative = selfLink.url.startsWith("/") ||
            selfLink.url.startsWith("Patient");

        assertEquals(
            isAbsolute || isRelative,
            true,
            "Self link should be either an absolute or relative URI",
        );
    });
}
