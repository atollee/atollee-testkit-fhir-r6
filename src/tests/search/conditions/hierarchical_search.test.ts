// tests/search/parameters/hierarchical_search.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    createTestValueSet,
} from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runHierarchicalSearchTests(context: ITestContext) {
    if (context.isHapiBugsDisallowed()) {
        it("Should find ValueSets using :below modifier", async () => {
            const baseUrl = uniqueString(
                "http://example.org/fhir/ValueSet/test-hierarchy",
            );

            // Create a hierarchy of ValueSets
            const parentValueSet = await createTestValueSet(context, {
                url: baseUrl,
                name: "ParentValueSet",
                status: "active",
            });

            const childValueSet1 = await createTestValueSet(context, {
                url: `${baseUrl}/child1`,
                name: "ChildValueSet1",
                status: "active",
            });

            const childValueSet2 = await createTestValueSet(context, {
                url: `${baseUrl}/child2`,
                name: "ChildValueSet2",
                status: "active",
            });

            // Search for ValueSets using :below modifier
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `ValueSet?url:below=${
                    encodeURIComponent(baseUrl)
                }`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process hierarchical search with :below modifier successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                "Bundle should contain three matching ValueSets (parent and two children)",
            );

            const valueSetIds = bundle.entry.map((entry) =>
                (entry.resource as ValueSet).id
            );
            assertTrue(
                valueSetIds.includes(parentValueSet.id),
                "Results should include parent ValueSet",
            );
            assertTrue(
                valueSetIds.includes(childValueSet1.id),
                "Results should include child ValueSet 1",
            );
            assertTrue(
                valueSetIds.includes(childValueSet2.id),
                "Results should include child ValueSet 2",
            );

            // Verify that all returned ValueSets have the correct URL hierarchy
            const returnedValueSets = bundle.entry.map((entry) =>
                entry.resource as ValueSet
            );
            assertTrue(
                returnedValueSets.every((vs) => vs.url?.startsWith(baseUrl)),
                "All returned ValueSets should have URLs that start with the base URL",
            );

            // Test with a specific version
            const responseWithVersion = await fetchWrapper({
                authorized: true,
                relativeUrl: `ValueSet?url:below=${
                    encodeURIComponent(baseUrl)
                }%7C1.0.0`,
            });

            assertEquals(
                responseWithVersion.status,
                200,
                "Server should process hierarchical search with :below modifier and version successfully",
            );
            const bundleWithVersion = responseWithVersion.jsonBody as Bundle;
            assertEquals(
                bundleWithVersion.entry?.length,
                3,
                "Bundle should contain three matching ValueSets when specifying version",
            );
        });
    }

    it("Should find ValueSets in hierarchy using :above modifier", async () => {
        const baseUrl = uniqueString(
            "http://example.org/fhir/ValueSet/test-hierarchy",
        );

        // Create a hierarchy of ValueSets
        const parentValueSet = await createTestValueSet(context, {
            url: baseUrl,
            name: "ParentValueSet",
            status: "active",
        });

        const childValueSet = await createTestValueSet(context, {
            url: `${baseUrl}/child`,
            name: "ChildValueSet",
            status: "active",
        });

        const grandchildValueSet = await createTestValueSet(context, {
            url: `${baseUrl}/child/grandchild`,
            name: "GrandchildValueSet",
            status: "active",
        });

        // Search for ValueSets in the hierarchy using :above modifier
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:above=${
                encodeURIComponent(`${baseUrl}/child/grandchild`)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process hierarchical search with :above modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching ValueSets",
        );

        const valueSetUrls = bundle.entry.map((entry) =>
            (entry.resource as ValueSet).url
        );
        assertTrue(
            valueSetUrls.includes(parentValueSet.url),
            "Results should include parent ValueSet",
        );
        assertTrue(
            valueSetUrls.includes(childValueSet.url),
            "Results should include child ValueSet",
        );
        assertTrue(
            valueSetUrls.includes(grandchildValueSet.url),
            "Results should include grandchild ValueSet",
        );

        // Test with a specific version
        const responseWithVersion = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:above=${
                encodeURIComponent(`${baseUrl}/child/grandchild`)
            }|1.0.0`,
        });

        assertEquals(
            responseWithVersion.status,
            200,
            "Server should process hierarchical search with :above modifier and version successfully",
        );
        const bundleWithVersion = responseWithVersion.jsonBody as Bundle;
        assertEquals(
            bundleWithVersion.entry?.length,
            3,
            "Bundle should contain three matching ValueSets when specifying version",
        );

        // Test searching from a child URL
        const responseFromChild = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:above=${
                encodeURIComponent(`${baseUrl}/child`)
            }`,
        });

        assertEquals(
            responseFromChild.status,
            200,
            "Server should process hierarchical search from child URL successfully",
        );
        const bundleFromChild = responseFromChild.jsonBody as Bundle;
        assertEquals(
            bundleFromChild.entry?.length,
            2,
            "Bundle should contain two matching ValueSets when searching from child URL",
        );

        // Verify that the child search doesn't include the grandchild
        const childSearchUrls =
            bundleFromChild.entry?.map((entry) =>
                (entry.resource as ValueSet).url
            ) || [];
        assertTrue(
            childSearchUrls.includes(parentValueSet.url),
            "Child search results should include parent ValueSet",
        );
        assertTrue(
            childSearchUrls.includes(childValueSet.url),
            "Child search results should include child ValueSet",
        );
        assertFalse(
            childSearchUrls.includes(grandchildValueSet.url),
            "Child search results should not include grandchild ValueSet",
        );
    });

    it("Should handle :above/:below modifiers on non-hierarchical references", async () => {
        const patient = await createTestPatient(context, {
            name: [{ family: uniqueString("TestPatient") }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:below=${patient.id}`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject hierarchical search on non-hierarchical reference",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });
}
