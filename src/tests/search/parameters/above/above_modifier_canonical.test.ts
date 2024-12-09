// tests/search/parameters/above_modifier_canonical.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../../utils/fetch.ts";
import { createTestStructureDefinition } from "../../../utils/resource_creators.ts";
import {
    Bundle,
    OperationOutcome,
    StructureDefinition,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";
import { Context } from "https://deno.land/x/oak@14.2.0/mod.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAboveModifierCanonicalTests(context: ITestContext) {
    if (
        context.isCanonicalUrlAboveModifierSupported() &&
        context.isSemverVersionComparisonSupported()
    ) {
        it("Should find resources with versions above the specified version", async () => {
            const baseUrl = uniqueString(
                "http://example.com/StructureDefinition/TestResource",
            );

            await createTestStructureDefinition(context, {
                url: baseUrl,
                version: "1.0.0",
                name: "TestResource1",
                status: "active",
                kind: "resource",
                abstract: false,
                type: "TestResource",
                versionScheme: "semver",
            });

            await createTestStructureDefinition(context, {
                url: baseUrl,
                version: "1.1.0",
                name: "TestResource2",
                status: "active",
                kind: "resource",
                abstract: false,
                type: "TestResource",
                versionScheme: "semver",
            });

            await createTestStructureDefinition(context, {
                url: baseUrl,
                version: "2.0.0",
                name: "TestResource3",
                status: "active",
                kind: "resource",
                abstract: false,
                type: "TestResource",
                versionScheme: "semver",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `StructureDefinition?url:above=${
                    encodeURIComponent(baseUrl)
                }|1.0.0`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process search with above modifier on canonical reference successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Bundle should contain two matching StructureDefinitions",
            );

            const versions = bundle.entry.map((entry) =>
                (entry.resource as StructureDefinition).version
            );
            assertTrue(
                versions.includes("1.1.0"),
                "Results should include version 1.1.0",
            );
            assertTrue(
                versions.includes("2.0.0"),
                "Results should include version 2.0.0",
            );
        });
    }

    it("Should handle URL escaping in canonical references", async () => {
        const baseUrl = uniqueString(
            "http://example.com/StructureDefinition/Test|Resource",
        );

        await createTestStructureDefinition(context, {
            url: baseUrl,
            version: "1.0.0",
            name: "TestResource1",
            status: "active",
            kind: "resource",
            abstract: false,
            type: "TestResource",
            versionScheme: "semver",
        });

        const escapedUrl = encodeURIComponent(baseUrl);
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `StructureDefinition?url:above=${escapedUrl}|0.9.0`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped URL successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching StructureDefinition",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should reject or ignore version-related search on resources with unknown version scheme", async () => {
            const baseUrl = uniqueString(
                "http://example.com/StructureDefinition/UnknownVersionScheme",
            );

            await createTestStructureDefinition(context, {
                url: baseUrl,
                version: "1.0.0",
                name: "UnknownVersionScheme",
                status: "active",
                kind: "resource",
                abstract: false,
                type: "TestResource",
                // Note: no versionScheme specified
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `StructureDefinition?url:above=${
                    encodeURIComponent(baseUrl)
                }|0.9.0`,
            });

            // The server should either reject the search (status 400) or ignore the version part (status 200 with no results)
            if (response.status === 400) {
                const operationOutcome = response.jsonBody as OperationOutcome;
                assertExists(
                    operationOutcome.issue,
                    "OperationOutcome should contain issues",
                );
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.severity === "error"
                    ),
                    "OperationOutcome should contain an error",
                );
            } else {
                assertEquals(
                    response.status,
                    200,
                    "Server should process the search request",
                );
                const bundle = response.jsonBody as Bundle;
                assertExists(bundle.entry, "Bundle should contain entries");
                assertEquals(
                    bundle.entry.length,
                    0,
                    "Bundle should not contain any matching StructureDefinitions",
                );
            }
        });
    }
}
