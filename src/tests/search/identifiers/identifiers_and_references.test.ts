// tests/search/identifiers/identifiers_and_references.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
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

        const response = await fetchWrapper({
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
        assertEquals(
            patient.identifier?.[0].system,
            patientIdentifier.system,
            "Patient should have the correct identifier system",
        );
        assertEquals(
            patient.identifier?.[0].value,
            patientIdentifier.value,
            "Patient should have the correct identifier value",
        );
    });

    it("Should search for encounters by patient identifier using chaining", async () => {
        const patientIdentifier = {
            system: "http://example.com/mrn",
            value: "MRN5678",
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
                `Encounter?subject:Patient.identifier=${patientIdentifier.system}|${patientIdentifier.value}`,
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

    it("Should search for encounters by patient identifier using identifier modifier", async () => {
        const patientIdentifier = {
            system: "http://example.com/mrn",
            value: "MRN9012",
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestEncounter(context, {
            subject: {
                reference: `Patient/${patient.id}`,
                identifier: patientIdentifier,
            },
            status: "finished",
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "AMB",
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Encounter?subject:identifier=${patientIdentifier.system}|${patientIdentifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process identifier modifier search successfully",
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

    it("Should handle multiple identifiers for a single patient", async () => {
        const identifiers = [
            { system: "http://example.com/mrn", value: "MRN3456" },
            { system: "http://example.com/ssn", value: "SSN7890" },
        ];

        await createTestPatient(context, {
            identifier: identifiers,
        });

        for (const identifier of identifiers) {
            const response = await fetchWrapper({
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
