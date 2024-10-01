// tests/search/parameters/exact_modifier.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runExactModifierTests(context: ITestContext) {
    it("Should find patient with exact match on family name (case-sensitive)", async () => {
        const familyName = uniqueString("Son");
        await createTestPatient(context, { name: [{ family: familyName }] });
        await createTestPatient(context, { name: [{ family: familyName.toLowerCase() }] });
        await createTestPatient(context, { name: [{ family: familyName.toUpperCase() }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(response.status, 200, "Server should process search with exact modifier successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry?.length, 1, "Should find exactly one patient");
        assertEquals((bundle.entry && bundle.entry[0].resource as Patient)?.name?.[0].family, familyName, "Should match the exact family name");
    });

    it("Should not find patients with different casing or partial matches", async () => {
        const familyName = uniqueString("Johnson");
        await createTestPatient(context, { name: [{ family: familyName.toLowerCase() }] });
        await createTestPatient(context, { name: [{ family: familyName.toUpperCase() }] });
        await createTestPatient(context, { name: [{ family: familyName + "son" }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(response.status, 200, "Server should process search successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry?.length, 0, "Should not find any patients");
    });

    it("Should handle diacritics and combining characters exactly", async () => {
        const testCases = [
            { name: "Zoë", searchTerm: "Zoë", shouldMatch: true },
            { name: "Zoe\u0308", searchTerm: "Zoë", shouldMatch: false }, // Different Unicode representation
            { name: "Renée", searchTerm: "Renée", shouldMatch: true },
            { name: "Renee", searchTerm: "Renée", shouldMatch: false },
        ];

        for (const testCase of testCases) {
            await createTestPatient(context, { name: [{ family: testCase.name }] });
        }

        for (const testCase of testCases) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient?family:exact=${encodeURIComponent(testCase.searchTerm)}`,
            });

            assertEquals(response.status, 200, `Server should process search for "${testCase.searchTerm}" successfully`);
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            
            if (testCase.shouldMatch) {
                assertEquals(bundle.entry?.length, 1, `Should find one patient for "${testCase.searchTerm}"`);
                assertEquals((bundle.entry && bundle.entry[0].resource as Patient)?.name?.[0].family, testCase.name, `Should match the exact family name "${testCase.name}"`);
            } else {
                assertEquals(bundle.entry?.length, 0, `Should not find any patients for "${testCase.searchTerm}"`);
            }
        }
    });

    it("Should reject exact modifier on non-string search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:exact=2000-01-01`,
        });

        assertEquals(response.status, 400, "Server should reject exact modifier on non-string search parameters");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
        assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
    });

    it("Should handle whitespace and special characters exactly", async () => {
        const testCases = [
            { name: "O'Brien", searchTerm: "O'Brien", shouldMatch: true },
            { name: "O'brien", searchTerm: "O'Brien", shouldMatch: false },
            { name: "Van der Berg", searchTerm: "Van der Berg", shouldMatch: true },
            { name: "Van der berg", searchTerm: "Van der Berg", shouldMatch: false },
            { name: "  Smith  ", searchTerm: "  Smith  ", shouldMatch: true },
            { name: "Smith", searchTerm: "  Smith  ", shouldMatch: false },
        ];

        for (const testCase of testCases) {
            await createTestPatient(context, { name: [{ family: testCase.name }] });
        }

        for (const testCase of testCases) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient?family:exact=${encodeURIComponent(testCase.searchTerm)}`,
            });

            assertEquals(response.status, 200, `Server should process search for "${testCase.searchTerm}" successfully`);
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            
            if (testCase.shouldMatch) {
                assertEquals(bundle.entry?.length, 1, `Should find one patient for "${testCase.searchTerm}"`);
                assertEquals((bundle.entry && bundle.entry[0].resource as Patient)?.name?.[0].family, testCase.name, `Should match the exact family name "${testCase.name}"`);
            } else {
                assertEquals(bundle.entry?.length, 0, `Should not find any patients for "${testCase.searchTerm}"`);
            }
        }
    });
}