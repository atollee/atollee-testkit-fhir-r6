// tests/search/identifiers/canonical_identifiers.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runCanonicalIdentifiersTests(context: ITestContext) {
    it("Should search encounters by patient identifier using chaining", async () => {
        const patientIdentifier = {
            system: uniqueString("http://example.org/facilityA"),
            value: uniqueString("1234"),
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
                `Encounter?patient.identifier=${patientIdentifier.system}%7C${patientIdentifier.value}`,
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
}
