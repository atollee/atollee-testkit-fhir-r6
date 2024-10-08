// tests/search/identifiers/canonical_identifiers.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestIdentifierString,
    createTestImplementationGuide,
    createTestValueSet,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, ImplementationGuide, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runCanonicalIdentifiersAddonTests(context: ITestContext) {
    it("Should search for a ValueSet by its canonical URL", async () => {
        const canonicalUrl = uniqueString(
            "http://example.org/fhir/ValueSet/test-value-set",
        );
        const valueSet = await createTestValueSet(context, {
            url: canonicalUrl,
            name: "TestValueSet",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${encodeURIComponent(canonicalUrl)}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process canonical URL search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with the specified canonical URL",
        );

        const foundValueSet = bundle.entry[0].resource as ValueSet;
        assertEquals(
            foundValueSet.id,
            valueSet.id,
            "Found ValueSet should match the created ValueSet",
        );
        assertEquals(
            foundValueSet.url,
            canonicalUrl,
            "Found ValueSet should have the correct canonical URL",
        );
    });

    it("Should search for resources referencing a canonical resource", async () => {
        const testIdentifierString = createTestIdentifierString();
        const canonicalUrl =
            `http://example.org/fhir/ValueSet/${testIdentifierString}`;
        await createTestValueSet(context, {
            url: canonicalUrl,
            name: "TestValueSetReferenced",
        });

        const implementationGuide = await createTestImplementationGuide(
            context,
            {
                url: `http://example.org/fhir/ImplementationGuide/test-${testIdentifierString}`,
                name: `TestIG-${testIdentifierString}`,
                dependsOn: [
                    {
                        uri: canonicalUrl,
                    },
                ],
            },
        );

        // no fetchSearchWrapper as ImplementationGuide does not have any identifier
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ImplementationGuide?depends-on=${
                encodeURIComponent(canonicalUrl)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search for resources referencing a canonical successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ImplementationGuide referencing the specified ValueSet",
        );

        const foundIG = bundle.entry[0].resource as ImplementationGuide;
        assertEquals(
            foundIG.id,
            implementationGuide.id,
            "Found ImplementationGuide should match the created ImplementationGuide",
        );
        assertEquals(
            foundIG.dependsOn?.[0].uri,
            canonicalUrl,
            "Found ImplementationGuide should reference the correct ValueSet",
        );
    });
}

function uniuqeString(arg0: string) {
    throw new Error("Function not implemented.");
}
