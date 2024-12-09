// tests/search/parameters/iterate_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Observation,
    Patient,
    Provenance,
    RelatedPerson,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runIterateModifierTests(context: ITestContext) {
    it("Should include patient and linked patients/related persons when using iterate modifier", async () => {
        // Create a main patient
        const mainPatient = await createTestPatient(context, {
            family: "Main",
            given: ["Patient"],
        });

        // Create a linked patient
        const linkedPatient = await createTestPatient(context, {
            family: "Linked",
            given: ["Patient"],
        });

        // Create a related person
        const relatedPerson: RelatedPerson = {
            resourceType: "RelatedPerson",
            patient: { reference: `Patient/${mainPatient.id}` },
            relationship: [{
                coding: [{
                    system: "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                    code: "WIFE",
                }],
            }],
            name: [{ family: "Related", given: ["Person"] }],
        };

        const relatedPersonResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "RelatedPerson",
            method: "POST",
            body: JSON.stringify(relatedPerson),
        });

        const createdRelatedPerson = relatedPersonResponse
            .jsonBody as RelatedPerson;

        // Link the patients and related person
        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${mainPatient.id}`,
            method: "PUT",
            body: JSON.stringify({
                ...mainPatient,
                link: [
                    {
                        other: { reference: `Patient/${linkedPatient.id}` },
                        type: "seealso",
                    },
                    {
                        other: {
                            reference:
                                `RelatedPerson/${createdRelatedPerson.id}`,
                        },
                        type: "seealso",
                    },
                ],
            }),
        });

        // Create an observation for the main patient
        await createTestObservation(context, mainPatient.id!, {
            code: "3738000",
            system: "http://snomed.info/sct",
            status: "final",
            display: "Viral hepatitis (disorder)",
        });

        // Perform the search with iterate modifier
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=http://snomed.info/sct|3738000&_include=Observation:patient&_include:iterate=Patient:link`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with iterate modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const observationEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "Observation"
        );
        const patientEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "Patient"
        );
        const relatedPersonEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "RelatedPerson"
        );

        assertEquals(
            observationEntries.length,
            1,
            "Should find one matching Observation",
        );
        assertEquals(
            patientEntries.length,
            2,
            "Should include main Patient and linked Patient",
        );
        assertEquals(
            relatedPersonEntries.length,
            1,
            "Should include linked RelatedPerson",
        );

        const observationResource = observationEntries[0]
            .resource as Observation;
        assertEquals(
            observationResource.subject?.reference,
            `Patient/${mainPatient.id}`,
            "Observation should reference the main Patient",
        );

        const patientIds = patientEntries.map((entry) =>
            (entry.resource as Patient).id
        );
        assertTrue(
            patientIds.includes(mainPatient.id),
            "Should include the main Patient",
        );
        assertTrue(
            patientIds.includes(linkedPatient.id),
            "Should include the linked Patient",
        );

        const relatedPersonResource = relatedPersonEntries[0]
            .resource as RelatedPerson;
        assertEquals(
            relatedPersonResource.patient?.reference,
            `Patient/${mainPatient.id}`,
            "RelatedPerson should reference the main Patient",
        );
    });

    it("Should support iterate modifier with _revinclude", async () => {
        // Create a main patient
        const mainPatient = await createTestPatient(context, {
            family: "Main",
            given: ["Patient"],
        });

        assertTrue(mainPatient.id);

        // Create an observation for the main patient
        const observation = await createTestObservation(
            context,
            mainPatient.id,
            {
                code: "3738000",
                system: "http://snomed.info/sct",
                status: "final",
                display: "Viral hepatitis (disorder)",
            },
        );

        // Create a provenance record for the observation
        const provenance = {
            resourceType: "Provenance",
            target: [{ reference: `Observation/${observation.id}` }],
            recorded: new Date().toISOString(),
            agent: [{ who: { reference: `Patient/${mainPatient.id}` } }],
        };

        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Provenance",
            method: "POST",
            body: JSON.stringify(provenance),
        });

        // Perform the search with _revinclude and iterate modifier
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_id=${mainPatient.id}&_revinclude=Observation:patient&_revinclude:iterate=Provenance:target`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with _revinclude and iterate modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const patientEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "Patient"
        );
        const observationEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "Observation"
        );
        const provenanceEntries = bundle.entry.filter((entry) =>
            entry.resource?.resourceType === "Provenance"
        );

        assertEquals(
            patientEntries.length,
            1,
            "Should find one matching Patient",
        );
        assertEquals(
            observationEntries.length,
            1,
            "Should include one Observation",
        );
        assertEquals(
            provenanceEntries.length,
            1,
            "Should include one Provenance record",
        );

        const patientResource = patientEntries[0].resource as Patient;
        assertEquals(
            patientResource.id,
            mainPatient.id,
            "Should match the main Patient",
        );

        const observationResource = observationEntries[0]
            .resource as Observation;
        assertEquals(
            observationResource.subject?.reference,
            `Patient/${mainPatient.id}`,
            "Observation should reference the main Patient",
        );

        const provenanceResource = provenanceEntries[0].resource as Provenance;
        assertEquals(
            provenanceResource.target[0].reference,
            `Observation/${observation.id}`,
            "Provenance should reference the Observation",
        );
    });
}
