// tests/search/parameters/not_in_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestValueSet,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runNotInModifierTests(context: ITestContext) {
    it("Should find conditions with codes not in a specified ValueSet", async () => {
        // Create a ValueSet
        const valueSetId = uniqueString("test-valueset");
        const valueSetUrl = `http://example.org/fhir/ValueSet/${valueSetId}`;
        const valueSet = await createTestValueSet(context, {
            id: valueSetId,
            url: valueSetUrl,
            compose: {
                include: [{
                    system: "http://snomed.info/sct",
                    concept: [
                        {
                            code: "235862008",
                            display: "Hepatitis due to infection",
                        },
                        {
                            code: "773113008",
                            display: "Acute infectious hepatitis",
                        },
                        {
                            code: "95897009",
                            display: "Amebic hepatitis",
                        },
                    ],
                }],
            },
        });

        // Create conditions with codes in the ValueSet
        for (const concept of valueSet.compose!.include[0].concept!) {
            await createTestCondition(context, {
                code: {
                    coding: [{
                        system: "http://snomed.info/sct",
                        code: concept.code,
                        display: concept.display,
                    }],
                },
            });
        }

        // Create a condition with a code not in the ValueSet
        const notInValueSetCode = "54398005";
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: notInValueSetCode,
                    display: "Acute upper respiratory infection",
                }],
            },
        });

        // Create a condition with no code
        await createTestCondition(context, {
            // No code specified
        });

        // Test with fully qualified URL
        const responseFullUrl = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:not-in=${
                encodeURIComponent(valueSetUrl)
            }`,
        });

        assertEquals(
            responseFullUrl.status,
            200,
            "Server should process search with not-in modifier and full URL successfully",
        );
        const bundleFullUrl = responseFullUrl.jsonBody as Bundle;
        assertExists(bundleFullUrl.entry, "Bundle should contain entries");
        assertEquals(
            bundleFullUrl.entry.length,
            2,
            "Should find two conditions: one with code not in ValueSet and one with no code",
        );

        // Test with logical reference
        const responseLogical = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:not-in=ValueSet/${valueSetId}`,
        });

        assertEquals(
            responseLogical.status,
            200,
            "Server should process search with not-in modifier and logical reference successfully",
        );
        const bundleLogical = responseLogical.jsonBody as Bundle;
        assertEquals(
            bundleLogical.entry?.length,
            2,
            "Should find same number of conditions with logical reference",
        );

        // Verify returned resources
        for (const bundle of [bundleFullUrl, bundleLogical]) {
            for (const entry of bundle.entry!) {
                const condition = entry.resource as Condition;

                if (condition.code?.coding) {
                    // If has code, verify it's not in the ValueSet
                    assertTrue(
                        condition.code.coding.every((coding) =>
                            coding.system !== "http://snomed.info/sct" ||
                            !valueSet.compose!.include[0].concept!.some(
                                (concept) => concept.code === coding.code
                            )
                        ),
                        "Conditions with codes should not have codes from the ValueSet",
                    );
                } else {
                    // If no code, that's valid for :not-in
                    assertTrue(
                        true,
                        "Condition with no code is valid for :not-in search",
                    );
                }
            }
        }
    });

    if (context.isNotInModifierSnomedSystemSupported()) {
        it("Should handle URL-encoded ValueSet references", async () => {
            const snomedSubset = "http://snomed.info/sct?fhir_vs=isa/235862008";
            const encodedSnomedSubset = encodeURIComponent(snomedSubset);

            // Create conditions with codes in the SNOMED subset
            await createTestCondition(context, {
                code: {
                    coding: [{
                        system: "http://snomed.info/sct",
                        code: "235862008",
                        display: "Hepatitis due to infection",
                    }],
                },
            });

            // Create a condition with a code not in the SNOMED subset
            await createTestCondition(context, {
                code: {
                    coding: [{
                        system: "http://snomed.info/sct",
                        code: "54398005",
                        display: "Acute upper respiratory infection",
                    }],
                },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Condition?code:not-in=${encodedSnomedSubset}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process search with URL-encoded ValueSet reference successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Should find exactly one condition not in the SNOMED subset",
            );

            const condition = bundle.entry[0].resource as Condition;
            assertEquals(
                condition.code?.coding?.[0].code,
                "54398005",
                "Found condition should have the correct code not in the SNOMED subset",
            );
        });
    }

    it("Should reject not-in modifier on non-token search parameters", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:not-in=ValueSet/123`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject not-in modifier on non-token search parameters",
        );
    });

    it("Should handle logical references to ValueSets", async () => {
        const logicalUrl = uniqueString(
            "http://example.org/fhir/ValueSet/test-logical-valueset",
        );
        await createTestValueSet(context, {
            url: logicalUrl,
            compose: {
                include: [{
                    system: "http://snomed.info/sct",
                    concept: [
                        { code: "123456", display: "Test Condition" },
                    ],
                }],
            },
        });

        // Create a condition with a code in the logical ValueSet
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "123456",
                    display: "Test Condition",
                }],
            },
        });

        // Create a condition with a code not in the logical ValueSet
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "789012",
                    display: "Another Test Condition",
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:not-in=${
                encodeURIComponent(logicalUrl)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with logical ValueSet reference successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one condition not in the logical ValueSet",
        );

        const condition = bundle.entry[0].resource as Condition;
        assertEquals(
            condition.code?.coding?.[0].code,
            "789012",
            "Found condition should have the correct code not in the logical ValueSet",
        );
    });

    it("Should not allow not-in modifier with boolean token parameters", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?active:not-in=ValueSet/123`,
        });

        assertTrue(
            response.status >= 400 && response.status < 500,
            "Server should reject not-in modifier with boolean token parameters",
        );
    });
}
