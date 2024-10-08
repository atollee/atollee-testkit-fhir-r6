// tests/search/parameters/exact_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runExactModifierTests(context: ITestContext) {
    it("Should find patient with exact match on family name (case-sensitive)", async () => {
        const familyName = uniqueString("Son");
        await createTestPatient(context, { name: [{ family: familyName }] });
        await createTestPatient(context, {
            name: [{ family: familyName.toLowerCase() }],
        });
        await createTestPatient(context, {
            name: [{ family: familyName.toUpperCase() }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with exact modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry?.length,
            1,
            "Should find exactly one patient",
        );
        assertEquals(
            (bundle.entry && bundle.entry[0].resource as Patient)?.name?.[0]
                .family,
            familyName,
            "Should match the exact family name",
        );
    });

    it("Should not find patients with different casing or partial matches", async () => {
        const familyName = uniqueString("Johnson");
        await createTestPatient(context, {
            name: [{ family: familyName.toLowerCase() }],
        });
        await createTestPatient(context, {
            name: [{ family: familyName.toUpperCase() }],
        });
        await createTestPatient(context, {
            name: [{ family: familyName + "son" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });

    it("Should match exact diacritic character (Zoë)", async () => {
        await createTestPatient(context, {
            name: [{ family: "Zoë" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${encodeURIComponent("Zoë")}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find one patient");
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].family,
            "Zoë",
            "Should match the exact family name 'Zoë'",
        );
    });

    it("Should not match different Unicode representation of diacritic (Zoe\\u0308)", async () => {
        await createTestPatient(context, {
            name: [{ family: "Zoe\u0308" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${encodeURIComponent("Zoë")}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });

    it("Should match exact diacritic character (Renée)", async () => {
        await createTestPatient(context, {
            name: [{ family: "Renée" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${encodeURIComponent("Renée")}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find one patient");
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].family,
            "Renée",
            "Should match the exact family name 'Renée'",
        );
    });

    it("Should not match name without diacritics (Renee) when searching with diacritics", async () => {
        await createTestPatient(context, {
            name: [{ family: "Renee" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${encodeURIComponent("Renée")}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });

    it("Should accept exact modifier on date search parameters", async () => {
        // First, create a patient with a specific birthdate
        const patient = await createTestPatient(context, {
            birthDate: "2000-01-01",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:exact=2000-01-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should accept exact modifier on date search parameters",
        );

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Returned patient should match the created patient",
        );

        // Test with a non-matching date to ensure :exact is working correctly
        const nonMatchingResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:exact=2000-01-02`,
        });

        assertEquals(
            nonMatchingResponse.status,
            200,
            "Server should process non-matching search successfully",
        );

        const nonMatchingBundle = nonMatchingResponse.jsonBody as Bundle;
        assertEquals(
            nonMatchingBundle.entry?.length ?? 0,
            0,
            "Non-matching search should return no results",
        );

        console.log(
            "Server correctly handled :exact modifier on date search parameter",
        );
    });

    it("Should match name with apostrophe exactly (O'Brien)", async () => {
        await createTestPatient(context, {
            name: [{ family: "O'Brien" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("O'Brien")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find one patient");
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].family,
            "O'Brien",
            "Should match the exact family name 'O'Brien'",
        );
    });

    it("Should not match name with different case in apostrophe (O'brien)", async () => {
        await createTestPatient(context, {
            name: [{ family: "O'brien" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("O'Brien")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });

    it("Should match multi-word name exactly (Van der Berg)", async () => {
        await createTestPatient(context, {
            name: [{ family: "Van der Berg" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("Van der Berg")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find one patient");
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].family,
            "Van der Berg",
            "Should match the exact family name 'Van der Berg'",
        );
    });

    it("Should not match multi-word name with different case (Van der berg)", async () => {
        await createTestPatient(context, {
            name: [{ family: "Van der berg" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("Van der Berg")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });

    it("Should match name with leading and trailing whitespace exactly (  Smith  )", async () => {
        await createTestPatient(context, {
            name: [{ family: "  Smith  " }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("  Smith  ")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find one patient");
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].family,
            "  Smith  ",
            "Should match the exact family name '  Smith  ' including whitespace",
        );
    });

    it("Should not match name without whitespace when searching with whitespace (Smith vs   Smith  )", async () => {
        await createTestPatient(context, {
            name: [{ family: "Smith" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${
                encodeURIComponent("  Smith  ")
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Should not find any patients",
        );
    });
}
