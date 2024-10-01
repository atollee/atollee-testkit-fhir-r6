// tests/search/parameters/in_modifier.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestCondition } from "../../utils/resource_creators.ts";
import { Bundle, Condition, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runInModifierTests(context: ITestContext) {
    it("Should find conditions with codes in a specified ValueSet", async () => {
        const valueSetId = uniqueString("test-valueset");

        const testCodes = [
            { system: "http://snomed.info/sct", code: "235862008" },
            { system: "http://snomed.info/sct", code: "773113008" },
            { system: "http://snomed.info/sct", code: "95897009" },
            { system: "http://snomed.info/sct", code: "999999999" } // Not in ValueSet
        ];

        for (const code of testCodes) {
            await createTestCondition(context, {
                code: {
                    coding: [code]
                }
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:in=ValueSet/${valueSetId}`,
        });

        assertEquals(response.status, 200, "Server should process search with in modifier successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry?.length, 3, "Should find exactly three conditions");

        const foundCodes = bundle.entry?.map(entry => (entry.resource as Condition).code?.coding?.[0].code);
        assertTrue(foundCodes.includes("235862008"), "Should find condition with code 235862008");
        assertTrue(foundCodes.includes("773113008"), "Should find condition with code 773113008");
        assertTrue(foundCodes.includes("95897009"), "Should find condition with code 95897009");
        assertTrue(!foundCodes.includes("999999999"), "Should not find condition with code 999999999");
    });

    it("Should handle URL-encoded ValueSet references", async () => {
        const snomedSubset = "http://snomed.info/sct?fhir_vs=isa/235862008";
        const encodedSnomedSubset = encodeURIComponent(snomedSubset);

        // Create test conditions
        await createTestCondition(context, {
            code: {
                coding: [{ system: "http://snomed.info/sct", code: "235862008" }]
            }
        });
        await createTestCondition(context, {
            code: {
                coding: [{ system: "http://snomed.info/sct", code: "773113008" }]
            }
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:in=${encodedSnomedSubset}`,
        });

        assertEquals(response.status, 200, "Server should process search with URL-encoded ValueSet reference successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(bundle.entry?.length >= 2, "Should find at least two conditions");
    });

    it("Should reject in modifier on non-token search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:in=ValueSet/123`,
        });

        assertEquals(response.status, 400, "Server should reject in modifier on non-token search parameters");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
        assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
    });

    it("Should handle logical references to ValueSets", async () => {
        const logicalUrl = "http://example.org/fhir/ValueSet/test-logical-valueset";

        await createTestCondition(context, {
            code: {
                coding: [{ system: "http://snomed.info/sct", code: "123456" }]
            }
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:in=${encodeURIComponent(logicalUrl)}`,
        });

        assertEquals(response.status, 200, "Server should process search with logical ValueSet reference successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find exactly one condition");
    });

    it("Should not allow in modifier with boolean token parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?active:in=ValueSet/123`,
        });

        assertEquals(response.status, 400, "Server should reject in modifier with boolean token parameters");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
        assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
    });
}