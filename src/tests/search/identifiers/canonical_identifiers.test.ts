// tests/search/identifiers/canonical_identifiers.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runCanonicalIdentifiersTests(context: ITestContext) {
    it("Should search encounters by patient identifier using chaining", async () => {
        const patientIdentifier = {
            system: "http://example.org/facilityA",
            value: "1234",
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        const encounter = await createTestEncounter(context, {
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
                `Encounter?patient.identifier=${patientIdentifier.system}|${patientIdentifier.value}`,
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

        const foundEncounter = bundle.entry[0].resource as Encounter;
        assertEquals(
            foundEncounter.id,
            encounter.id,
            "Found encounter should match the created encounter",
        );
        assertEquals(
            foundEncounter.subject?.reference,
            `Patient/${patient.id}`,
            "Encounter should reference the correct patient",
        );
    });

    it("Should search encounters by patient identifier using identifier modifier", async () => {
        const patientIdentifier = {
            system: "http://example.org/facilityA",
            value: "5678",
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        const encounter = await createTestEncounter(context, {
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
                `Encounter?patient:identifier=${patientIdentifier.system}|${patientIdentifier.value}`,
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

        const foundEncounter = bundle.entry[0].resource as Encounter;
        assertEquals(
            foundEncounter.id,
            encounter.id,
            "Found encounter should match the created encounter",
        );
        assertEquals(
            foundEncounter.subject?.reference,
            `Patient/${patient.id}`,
            "Encounter should reference the correct patient",
        );
    });

    it("Should demonstrate the difference between chained search and identifier modifier", async () => {
        const patientIdentifier1 = {
            system: "http://example.org/facilityA",
            value: "9012",
        };
        const patientIdentifier2 = {
            system: "http://example.org/facilityB",
            value: "3456",
        };

        const patient1 = await createTestPatient(context, {
            identifier: [patientIdentifier1],
        });
        await createTestPatient(context, {
            identifier: [patientIdentifier2],
        });

        // Create an encounter referencing patient1, but with patient2's identifier
        const encounter = await createTestEncounter(context, {
            subject: {
                reference: `Patient/${patient1.id}`,
                identifier: patientIdentifier2,
            },
            status: "finished",
            class: {
                system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                code: "AMB",
            },
        });

        // Chained search
        const chainedResponse = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Encounter?patient.identifier=${patientIdentifier1.system}|${patientIdentifier1.value}`,
        });

        // Identifier modifier search
        const modifierResponse = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Encounter?patient:identifier=${patientIdentifier2.system}|${patientIdentifier2.value}`,
        });

        assertEquals(
            chainedResponse.status,
            200,
            "Server should process chained search successfully",
        );
        assertEquals(
            modifierResponse.status,
            200,
            "Server should process modifier search successfully",
        );

        const chainedBundle = chainedResponse.jsonBody as Bundle;
        const modifierBundle = modifierResponse.jsonBody as Bundle;

        assertEquals(
            chainedBundle.entry?.length,
            1,
            "Chained search should find 1 encounter",
        );
        assertEquals(
            modifierBundle.entry?.length,
            1,
            "Modifier search should find 1 encounter",
        );

        const chainedEncounter = chainedBundle.entry?.[0].resource as Encounter;
        const modifierEncounter = modifierBundle.entry?.[0]
            .resource as Encounter;

        assertEquals(
            chainedEncounter.id,
            encounter.id,
            "Chained search should find the correct encounter",
        );
        assertEquals(
            modifierEncounter.id,
            encounter.id,
            "Modifier search should find the correct encounter",
        );
    });
}
