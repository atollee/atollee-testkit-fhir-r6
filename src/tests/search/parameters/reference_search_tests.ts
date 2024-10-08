// tests/search/parameters/reference_search_tests.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestGroup,
    createTestObservation,
    createTestPatient,
    createTestPractitioner,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runReferenceSearchTests(context: ITestContext) {
    it("Should search for observations with a local reference", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process local reference search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Observation should reference the correct patient",
        );
    });

    it("Should search for observations with a typed local reference", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=Patient/${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process typed local reference search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Observation should reference the correct patient",
        );
    });

    it("Should search for observations with an absolute URL reference", async () => {
        const patient = await createTestPatient(context);
        const absoluteUrl = `${context.getBaseUrl()}/Patient/${patient.id}`;
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: absoluteUrl },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${
                encodeURIComponent(absoluteUrl)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process absolute URL reference search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            absoluteUrl,
            "Observation should reference the correct patient URL",
        );
    });

    it("Should search for observations with multiple possible reference types", async () => {
        const patient = await createTestPatient(context);
        const practitioner = await createTestPractitioner(context);
        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
        });

        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Patient/${patient.id}` },
        });
        await createTestObservation(context, practitioner.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Practitioner/${practitioner.id}` },
        });
        await createTestObservation(context, group.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Group/${group.id}` },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multi-type reference search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Should find three observations with matching ID",
        );

        const subjectTypes = bundle.entry.map((entry) =>
            (entry.resource as Observation).subject?.reference?.split("/")[0]
        );
        assertTrue(
            subjectTypes.includes("Patient"),
            "Should find an observation referencing a Patient",
        );
        assertTrue(
            subjectTypes.includes("Practitioner"),
            "Should find an observation referencing a Practitioner",
        );
        assertTrue(
            subjectTypes.includes("Group"),
            "Should find an observation referencing a Group",
        );
    });

    it("Should search using the type modifier", async () => {
        const patient = await createTestPatient(context);
        const practitioner = await createTestPractitioner(context);

        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Patient/${patient.id}` },
        });
        await createTestObservation(context, practitioner.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
            subject: { reference: `Practitioner/${practitioner.id}` },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process type modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Observation should reference the correct patient",
        );
    });

    it("Should search using the identifier modifier", async () => {
        const patientMRN = uniqueString("MRN");
        const patient = await createTestPatient(context, {
            identifier: [{
                system: "http://acme.org/fhir/identifier/mrn",
                value: patientMRN,
            }],
        });
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            value: 100,
            unit: "mg/dL",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject:identifier=http://acme.org/fhir/identifier/mrn|${patientMRN}`,
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
            "Should find one observation for the patient",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.subject?.reference,
            `Patient/${patient.id}`,
            "Observation should reference the correct patient",
        );
    });
}
