// tests/search/parameters/missing_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
    createTestRiskAssessment,
    createTestValueSet,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient, RiskAssessment } from "npm:@types/fhir/r4.d.ts";
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

        const response = await fetchSearchWrapper({
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

        const response = await fetchSearchWrapper({
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
            birthdateUndefined: true,
        });

        // Create a patient with birthDate
        await createTestPatient(context, {
            family: familyName,
            birthDate: "1990-01-01",
        });

        const responseMissing = await fetchSearchWrapper({
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

        const responseNotMissing = await fetchSearchWrapper({
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

    if (context.isHapiBugsDisallowed()) {
        it("Should reject invalid values for missing modifier", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?given:missing=invalid`,
            });

            assertTrue(
                response.status >= 400 && response.status < 500,
                "Server should reject invalid value for missing modifier",
            );
        });
    }

    it("Should handle missing modifier on token type parameters", async () => {
        const familyName = uniqueString("TestFamily");

        // Create a patient without gender
        await createTestPatient(context, {
            family: familyName,
            genderUndefined: true,
        });

        // Create a patient with gender
        await createTestPatient(context, {
            family: familyName,
            gender: "male",
        });

        const responseMissing = await fetchSearchWrapper({
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

        const responseNotMissing = await fetchSearchWrapper({
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

    it("Should handle missing modifier on number type parameters", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        const subjectRef = {
            reference: `Patient/${patient.id}`,
        };

        // Create RiskAssessment without probability
        await createTestRiskAssessment(context, {
            subject: subjectRef,
            prediction: [{
                outcome: {
                    text: "Test outcome",
                },
            }],
        });

        // Create RiskAssessment with probability
        await createTestRiskAssessment(context, {
            subject: subjectRef,
            prediction: [{
                probabilityDecimal: 0.8,
                outcome: {
                    text: "Test outcome",
                },
            }],
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `RiskAssessment?subject=Patient/${patient.id}&probability:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on number parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertEquals(
            bundleMissing.entry?.length,
            1,
            "Should find one risk assessment with missing probability",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `RiskAssessment?subject=${patient.id}&probability:missing=false`,
        });

        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertEquals(
            bundleNotMissing.entry?.length,
            1,
            "Should find one risk assessment with non-missing probability",
        );

        // Verify the content
        const riskAssessmentWithMissing = bundleMissing.entry?.[0]
            .resource as RiskAssessment;
        assertEquals(
            riskAssessmentWithMissing.prediction?.[0].probabilityDecimal,
            undefined,
            "Risk assessment should not have probability",
        );

        const riskAssessmentWithValue = bundleNotMissing.entry?.[0]
            .resource as RiskAssessment;
        assertEquals(
            riskAssessmentWithValue.prediction?.[0].probabilityDecimal,
            0.8,
            "Risk assessment should have correct probability value",
        );
    });

    it("Should handle missing modifier on quantity type parameters", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        // Create observation without valueQuantity
        await createTestObservation(context, patient.id!, {
            system: "http://loinc.org",
            code: "8867-4",
            ignoreValue: true,
        });

        // Create observation with valueQuantity
        await createTestObservation(context, patient.id!, {
            system: "http://loinc.org",
            code: "8867-4",
            valueQuantity: {
                value: 72,
                unit: "beats/min",
                system: "http://unitsofmeasure.org",
                code: "/min",
            },
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject=${patient.id}&value-quantity:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on quantity parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertEquals(
            bundleMissing.entry?.length,
            1,
            "Should find one observation with missing value-quantity",
        );

        const responseNotMissing = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject=${patient.id}&value-quantity:missing=false`,
        });

        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertEquals(
            bundleNotMissing.entry?.length,
            1,
            "Should find one observation with non-missing value-quantity",
        );
    });

    it("Should handle missing modifier on reference type parameters", async () => {
        // Create medication requests with and without requester
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        // Create medication request without requester
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
        });

        // Create medication request with requester
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            requester: { reference: `Patient/${patient.id}` },
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?subject=${patient.id}&requester:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on reference parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertEquals(
            bundleMissing.entry?.length,
            1,
            "Should find one medication request with missing requester",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?subject=${patient.id}&requester:missing=false`,
        });

        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertEquals(
            bundleNotMissing.entry?.length,
            1,
            "Should find one medication request with non-missing requester",
        );
    });

    it("Should handle missing modifier on uri type parameters", async () => {
        // Create valuesets with and without uri
        const identifier = uniqueString("test-vs");
        const baseUrl = uniqueString("http://acme.org/fhir");

        // Create valueset without uri
        await createTestValueSet(context, {
            identifier: [{
                system: "http://example.org/tests",
                value: identifier,
            }],
        });

        // Create valueset with uri
        await createTestValueSet(context, {
            identifier: [{
                system: "http://example.org/tests",
                value: identifier,
            }],
            url: baseUrl,
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?identifier=${identifier}&url:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on uri parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertEquals(
            bundleMissing.entry?.length,
            1,
            "Should find one valueset with missing url",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?identifier=${identifier}&url:missing=false`,
        });

        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertEquals(
            bundleNotMissing.entry?.length,
            1,
            "Should find one valueset with non-missing url",
        );
    });

    it("Should handle additional token type parameter scenarios", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        // Create observation without category
        await createTestObservation(context, patient.id!, {
            system: "http://loinc.org",
            code: "8867-4",
        });

        // Create observation with category
        await createTestObservation(context, patient.id!, {
            system: "http://loinc.org",
            code: "8867-4",
            category: [{
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/observation-category",
                    code: "vital-signs",
                }],
            }],
        });

        const responseMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject=${patient.id}&category:missing=true`,
        });

        assertEquals(
            responseMissing.status,
            200,
            "Server should process search with missing modifier on token parameter successfully",
        );
        const bundleMissing = responseMissing.jsonBody as Bundle;
        assertEquals(
            bundleMissing.entry?.length,
            1,
            "Should find one observation with missing category",
        );

        const responseNotMissing = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject=${patient.id}&category:missing=false`,
        });

        const bundleNotMissing = responseNotMissing.jsonBody as Bundle;
        assertEquals(
            bundleNotMissing.entry?.length,
            1,
            "Should find one observation with non-missing category",
        );
    });
}
