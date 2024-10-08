// tests/search/identifiers/identifiers_and_references.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runIdentifiersAndReferencesTests(context: ITestContext) {
    it("Should search for a patient by identifier", async () => {
        const patientIdentifier = {
            system: "http://example.com/mrn",
            value: "MRN1234",
        };

        await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier=${patientIdentifier.system}|${patientIdentifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process identifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with the specified identifier",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertTrue(
            patient.identifier?.some((id) =>
                id.system === patientIdentifier.system &&
                id.value === patientIdentifier.value
            ),
            "Patient should have the correct identifier system and identifier value",
        );
    });

    it("Should search for encounters by patient identifier using chaining", async () => {
        const patientIdentifier = {
            system: uniqueString("http://example.com/mrn"),
            value: uniqueString("MRN5678"),
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestEncounter(context, {
            subject: { reference: `Patient/${patient.id}` },
            status: "finished",
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "AMB",
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Encounter?subject:Patient.identifier=${patientIdentifier.system}%7C${patientIdentifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process chained identifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 encounter for the patient with the specified identifier",
        );

        const encounter = bundle.entry[0].resource as Encounter;
        assertEquals(
            encounter.subject?.reference,
            `Patient/${patient.id}`,
            "Encounter should reference the correct patient",
        );
    });

    it("Should search for encounters by patient reference using patient's identifier", async () => {
        const system = uniqueString("http://example.com/mrn");
        const patientIdentifier = {
            system: system,
            value: "MRN9012",
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestEncounter(context, {
            subject: {
                reference: `Patient/${patient.id}`,
            },
            status: "finished",
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "AMB",
            },
        });

        // First, search for the patient using their identifier
        const patientResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${
                encodeURIComponent(patientIdentifier.system)
            }%7C${encodeURIComponent(patientIdentifier.value)}`,
        });

        assertEquals(
            patientResponse.status,
            200,
            "Server should process patient search by identifier successfully",
        );
        const patientBundle = patientResponse.jsonBody as Bundle;
        assertExists(
            patientBundle.entry,
            "Patient bundle should contain entries",
        );
        assertEquals(
            patientBundle.entry.length,
            1,
            "Should find 1 patient with the specified identifier",
        );

        const foundPatient = patientBundle.entry[0].resource as Patient;

        // Now, search for encounters using the found patient's id
        const encounterResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Encounter?patient=${foundPatient.id}`,
        });

        assertEquals(
            encounterResponse.status,
            200,
            "Server should process encounter search by patient successfully",
        );
        const encounterBundle = encounterResponse.jsonBody as Bundle;
        assertExists(
            encounterBundle.entry,
            "Encounter bundle should contain entries",
        );
        assertEquals(
            encounterBundle.entry.length,
            1,
            "Should find 1 encounter for the patient",
        );

        const encounter = encounterBundle.entry[0].resource as Encounter;
        assertEquals(
            encounter.subject?.reference,
            `Patient/${patient.id}`,
            "Encounter should reference the correct patient",
        );
    });

    it("Should handle multiple identifiers for a single patient", async () => {
        const identifiers = [
            { system: "http://example.com/mrn", value: "MRN3456" },
            { system: "http://example.com/ssn", value: "SSN7890" },
        ];

        await createTestPatient(context, {
            identifier: identifiers,
        });

        for (const identifier of identifiers) {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?identifier=${identifier.system}|${identifier.value}`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search for identifier ${identifier.value} successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                `Should find 1 patient with the identifier ${identifier.value}`,
            );
        }
    });
}
