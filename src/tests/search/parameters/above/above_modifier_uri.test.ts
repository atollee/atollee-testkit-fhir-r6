// tests/search/parameters/above_modifier_uri.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../../utils/fetch.ts";
import { createTestValueSet } from "../../../utils/resource_creators.ts";
import { Bundle, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAboveModifierUriTests(context: ITestContext) {
    if (context.isHapiBugsDisallowed()) {
        it("Should find ValueSets with URLs above the specified URL", async () => {
            const baseUrl = uniqueString("http://acme.org/fhir/ValueSet");

            await createTestValueSet(context, {
                url: `${baseUrl}/123/_history/5`,
                name: "TestValueSet1",
                status: "active",
            });
            await createTestValueSet(context, {
                url: `${baseUrl}/123/_history`,
                name: "TestValueSet2",
                status: "active",
            });
            await createTestValueSet(context, {
                url: `${baseUrl}/123`,
                name: "TestValueSet3",
                status: "active",
            });
            await createTestValueSet(context, {
                url: `${baseUrl}`,
                name: "TestValueSet4",
                status: "active",
            });
            await createTestValueSet(context, {
                url: "http://acme.org/fhir",
                name: "TestValueSet5",
                status: "active",
            });
            await createTestValueSet(context, {
                url: "http://acme.org",
                name: "TestValueSet6",
                status: "active",
            });
            // Create a ValueSet with an unrelated URL
            await createTestValueSet(context, {
                url: "http://example.com/fhir/ValueSet/456",
                name: "TestValueSet7",
                status: "active",
            });

            const searchUrl = `${baseUrl}/123/_history/5`;
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `ValueSet?url:above=${
                    encodeURIComponent(searchUrl)
                }`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process search with above modifier on URI successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                6,
                "Bundle should contain six matching ValueSets",
            );

            const urls = bundle.entry.map((entry) =>
                (entry.resource as ValueSet).url
            );
            assertTrue(
                urls.includes(`${baseUrl}/123/_history/5`),
                "Results should include the exact URL",
            );
            assertTrue(
                urls.includes(`${baseUrl}/123/_history`),
                "Results should include parent URL",
            );
            assertTrue(
                urls.includes(`${baseUrl}/123`),
                "Results should include ancestor URL",
            );
            assertTrue(
                urls.includes(`${baseUrl}`),
                "Results should include ancestor URL",
            );
            assertTrue(
                urls.includes("http://acme.org/fhir"),
                "Results should include ancestor URL",
            );
            assertTrue(
                urls.includes("http://acme.org"),
                "Results should include ancestor URL",
            );
            assertFalse(
                urls.includes("http://example.com/fhir/ValueSet/456"),
                "Results should not include unrelated URL",
            );
        });
    }
}
