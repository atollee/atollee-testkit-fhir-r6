// tests/search/parameters/type_modifier.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestObservation,
    createTestPatient,
    createTestPractitioner,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runTypeModifierTests(context: ITestContext) {
    it("Should find observations with a specific patient as subject", async () => {
        const patient = await createTestPatient(context);
        const practitioner = await createTestPractitioner(context);

        // Create an observation for the patient
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        // Create an observation with a practitioner as subject (should not be returned)
        await createTestObservation(context, practitioner.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Practitioner/${practitioner.id}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with type modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Found observation should reference the correct patient",
        );
    });

    it("Should be equivalent to standard reference search", async () => {
        const patient = await createTestPatient(context);

        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const responses = await Promise.all([
            fetchWrapper({
                authorized: true,
                relativeUrl: `Observation?subject:Patient=${patient.id}`,
            }),
            fetchWrapper({
                authorized: true,
                relativeUrl: `Observation?subject=Patient/${patient.id}`,
            }),
            fetchWrapper({
                authorized: true,
                relativeUrl: `Observation?patient=${patient.id}`,
            }),
        ]);

        responses.forEach((response, index) => {
            assertEquals(
                response.status,
                200,
                `Search ${index + 1} should be successful`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle ${index + 1} should contain entries`,
            );
            assertEquals(
                bundle.entry.length,
                1,
                `Search ${index + 1} should find exactly one observation`,
            );
        });
    });

    it("Should support chaining with type modifier", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
            given: [uniqueString("TestGiven")],
        });

        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient.family=${
                patient.name?.[0].family
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process chained search with type modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Found observation should reference the correct patient",
        );
    });

    it("Should support reverse chaining with type modifier", async () => {
        const patient = await createTestPatient(context);
        const encounter = await createTestEncounter(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            encounter: { reference: `Encounter/${encounter.id}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Encounter:patient:_id=${encounter.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process reverse chained search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Should find exactly one patient");

        const foundPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            foundPatient.id,
            patient.id,
            "Found patient should be the correct patient",
        );
    });

    it("Should reject type modifier with external references", async () => {
        const externalReference = "http://example.org/fhir/Patient/12345";

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${externalReference}`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject type modifier with external references",
        );
    });

    it("Should reject type modifier on non-reference search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name:Practitioner=John`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject type modifier on non-reference search parameters",
        );
    });
}