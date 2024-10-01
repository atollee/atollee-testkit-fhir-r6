// tests/search/parameters/missing_modifier.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runMissingModifierTests(context: ITestContext) {
    it("Should find patients with missing given name", async () => {
        const familyName = uniqueString("TestFamily");

        // Create a patient with only family name
        await createTestPatient(context, {
            family: familyName,
        });

        // Create a patient with both family and given names
        await createTestPatient(context, {
            family: familyName,
            given: ["TestGiven"],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&given:missing=true`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with missing modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one patient with missing given name",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertEquals(
            patient.name?.[0].family,
            familyName,
            "Found patient should have the correct family name",
        );
        assertEquals(
            patient.name?.[0].given,
            undefined,
            "Found patient should not have a given name",
        );
    });

    it("Should find patients with non-missing given name", async () => {
        const familyName = uniqueString("TestFamily");

        // Create a patient with only family name
        await createTestPatient(context, {
            family: familyName,
        });

        // Create a patient with both family and given names
        await createTestPatient(context, {
            family: familyName,
            given: ["TestGiven"],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&given:missing=false`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with missing=false modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one patient with non-missing given name",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertEquals(
            patient.name?.[0].family,
            familyName,
            "Found patient should have the correct family name",
        );
        assertExists(
            patient.name?.[0].given,
            "Found patient should have a given name",
        );
    });

    it("Should handle missing modifier on date type parameters", async () => {
        const familyName = uniqueString("TestFamily");

        // Create a patient without birthDate
        await createTestPatient(context, {
            family: familyName,
        });

        // Create a patient with birthDate
        await createTestPatient(context, {
            family: familyName,
            birthDate: "1990-01-01",
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&birthdate:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on date parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertExists(bundleMissing.entry, "Bundle should contain entries");
        assertEquals(
            bundleMissing.entry.length,
            1,
            "Should find one patient with missing birthDate",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&birthdate:missing=false`,
        });

        assertEquals(
            responseNotMissing.status,
            200,
            "Server should process search with missing=false modifier on date parameter successfully",
        );
        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertExists(bundleNotMissing.entry, "Bundle should contain entries");
        assertEquals(
            bundleNotMissing.entry.length,
            1,
            "Should find one patient with non-missing birthDate",
        );
    });

    it("Should reject invalid values for missing modifier", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?given:missing=invalid`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject invalid value for missing modifier",
        );
    });

    it("Should handle missing modifier on token type parameters", async () => {
        const familyName = uniqueString("TestFamily");

        // Create a patient without gender
        await createTestPatient(context, {
            family: familyName,
        });

        // Create a patient with gender
        await createTestPatient(context, {
            family: familyName,
            gender: "male",
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on token parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertExists(bundleMissing.entry, "Bundle should contain entries");
        assertEquals(
            bundleMissing.entry.length,
            1,
            "Should find one patient with missing gender",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:missing=false`,
        });

        assertEquals(
            responseNotMissing.status,
            200,
            "Server should process search with missing=false modifier on token parameter successfully",
        );
        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertExists(bundleNotMissing.entry, "Bundle should contain entries");
        assertEquals(
            bundleNotMissing.entry.length,
            1,
            "Should find one patient with non-missing gender",
        );
    });
}
