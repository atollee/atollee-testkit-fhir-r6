// tests/search/parameters/reference_search_tests.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestGroup,
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
    createTestPractitioner,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    MedicationRequest,
    Observation,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

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
            relativeUrl: `Observation?subject=Patient/${patient.id}`,
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
        assertTrue(
            observation.subject?.reference?.indexOf(`Patient/${patient.id}`) !==
                -1,
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
        assertTrue(
            observation.subject?.reference?.indexOf(`Patient/${patient.id}`) !==
                -1,
            "Observation should reference the correct patient",
        );
    });

    if (context.isAbsoluteUrlReferencesSupported()) {
        it("Should search for observations with an absolute URL reference", async () => {
            const patient = await createTestPatient(context);
            const absoluteUrl = `${context.getBaseUrl()}/Patient/${patient.id}`;
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
            });

            const response = await fetchWrapper({
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
    }

    it("Should search for observations with multiple possible reference types", async () => {
        const patient = await createTestPatient(context);
        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
        });

        const observationForPatient = await createTestObservation(
            context,
            patient.id!,
            {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                subject: { reference: `Patient/${patient.id}` },
            },
        );

        const observationForGroup = await createTestObservation(
            context,
            patient.id!,
            {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                subject: { reference: `Group/${group.id}` },
            },
        );

        // Search for observations referencing the patient
        const responsePatient = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });

        assertEquals(
            responsePatient.status,
            200,
            "Server should process patient reference search successfully",
        );
        const bundlePatient = responsePatient.jsonBody as Bundle;
        assertExists(bundlePatient.entry, "Bundle should contain entries");
        assertEquals(
            bundlePatient.entry.length,
            1,
            "Should find one observation for the patient",
        );
        assertEquals(
            (bundlePatient.entry[0].resource as Observation).id,
            observationForPatient.id,
            "Should find the correct observation for the patient",
        );

        // Search for observations referencing the group
        const responseGroup = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${group.id}`,
        });

        assertEquals(
            responseGroup.status,
            200,
            "Server should process group reference search successfully",
        );
        const bundleGroup = responseGroup.jsonBody as Bundle;
        assertExists(bundleGroup.entry, "Bundle should contain entries");
        assertEquals(
            bundleGroup.entry.length,
            1,
            "Should find one observation for the group",
        );
        assertEquals(
            (bundleGroup.entry[0].resource as Observation).id,
            observationForGroup.id,
            "Should find the correct observation for the group",
        );

        // Search for observations using the subject:Patient modifier
        const responsePatientModifier = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient=${patient.id}`,
        });

        assertEquals(
            responsePatientModifier.status,
            200,
            "Server should process patient type modifier search successfully",
        );
        const bundlePatientModifier = responsePatientModifier
            .jsonBody as Bundle;
        assertExists(
            bundlePatientModifier.entry,
            "Bundle should contain entries",
        );
        assertEquals(
            bundlePatientModifier.entry.length,
            1,
            "Should find one observation for the patient using type modifier",
        );
        assertEquals(
            (bundlePatientModifier.entry[0].resource as Observation).id,
            observationForPatient.id,
            "Should find the correct observation for the patient using type modifier",
        );
    });

    it("Should search using the type modifier", async () => {
        const patient = await createTestPatient(context);
        const group = await createTestGroup(context, {
            actual: true,
            type: "person",
        });

        const medicationRequestForPatient = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1731930",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
            },
        );

        const groupMedicationRequest = await createTestMedicationRequest(
            context,
            group.id!,
            {
                subject: { reference: `Group/${group.id}` },
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1731930",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?subject:Patient=${patient.id}`,
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
            "Should find one MedicationRequest for the patient",
        );

        const returnedMedicationRequest = bundle.entry[0]
            .resource as MedicationRequest;
        assertEquals(
            returnedMedicationRequest.id,
            medicationRequestForPatient.id,
            "Returned MedicationRequest should be the one for the patient",
        );
        assertTrue(
            returnedMedicationRequest.subject?.reference?.indexOf(
                `Patient/${patient.id}`,
            ) !== -1,
            "MedicationRequest should reference the correct patient",
        );
    });

    if (context.isIdentifierModifierSupported()) {
        it("Should search using the identifier modifier", async () => {
            const patientMRN = uniqueString("MRN");
            const patient = await createTestPatient(context, {
                identifier: [{
                    system: "http://acme.org/fhir/identifier/mrn",
                    value: patientMRN,
                }],
            });
            const testObservation = await createTestObservation(
                context,
                patient.id!,
                {
                    code: "15074-8",
                    system: "http://loinc.org",
                    value: 100,
                    unit: "mg/dL",
                },
            );

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?subject:identifier=http://acme.org/fhir/identifier/mrn%7C${patientMRN}`,
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
            assertTrue(
                observation.subject?.reference?.indexOf(
                    `Patient/${patient.id}`,
                ) !== -1,
                "Observation should reference the correct patient",
            );
        });
    }
}
