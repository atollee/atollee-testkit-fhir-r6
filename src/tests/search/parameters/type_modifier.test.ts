// tests/search/parameters/type_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestObservation,
    createTestPatient
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runTypeModifierTests(context: ITestContext) {
    it("Should find observations with a specific patient as subject", async () => {
        const patient = await createTestPatient(context);
        const secondPatient = await createTestPatient(context);

        // Create an observation for the patient
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        // Create an observation with a practitioner as subject (should not be returned)
        await createTestObservation(context, secondPatient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const response = await fetchSearchWrapper({
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
        assertTrue(
            observation.subject?.reference?.includes(`Patient/${patient.id}`),
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

        // First search using subject:Patient modifier
        const response1 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${patient.id}`,
        });
        assertEquals(
            response1.status,
            200,
            "Search 1 should be successful",
        );
        const bundle1 = response1.jsonBody as Bundle;
        assertExists(
            bundle1.entry,
            "Bundle 1 should contain entries",
        );
        assertEquals(
            bundle1.entry.length,
            1,
            "Search 1 should find exactly one observation",
        );

        // Second search using full reference format
        const response2 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=Patient/${patient.id}`,
        });
        assertEquals(
            response2.status,
            200,
            "Search 2 should be successful",
        );
        const bundle2 = response2.jsonBody as Bundle;
        assertExists(
            bundle2.entry,
            "Bundle 2 should contain entries",
        );
        assertEquals(
            bundle2.entry.length,
            1,
            "Search 2 should find exactly one observation",
        );

        // Third search using plain subject parameter
        const response3 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });
        assertEquals(
            response3.status,
            200,
            "Search 3 should be successful",
        );
        const bundle3 = response3.jsonBody as Bundle;
        assertExists(
            bundle3.entry,
            "Bundle 3 should contain entries",
        );
        assertEquals(
            bundle3.entry.length,
            1,
            "Search 3 should find exactly one observation",
        );
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

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient.family=${patient.name?.[0].family
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
        assertTrue(
            observation.subject?.reference?.includes(
                `Patient/${patient.id}`,
            ),
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

        const response = await fetchSearchWrapper({
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

    it("Should accept type modifier with external references (even though it's redundant)", async () => {
        const externalReference = "http://example.org/fhir/Patient/12345";

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${externalReference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should accept type modifier with external references",
        );

        // You might want to add more assertions here to check the content of the response
        // For example, you could check if the bundle is empty (assuming no matching Observations exist)
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Bundle should contain entries (even if empty)",
        );
        assertEquals(
            bundle.total,
            0,
            "Should find no Observations for the external Patient reference",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should reject type modifier on non-reference search parameters", async () => {
            const response = await fetchSearchWrapper({
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
}
