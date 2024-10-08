// tests/search/parameters/include_revinclude.test.ts

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
    createTestPractitioner,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runIncludeRevincludeTests(context: ITestContext) {
    it("Should include referenced resources with _include", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_id=${observation.id}&_include=Observation:subject`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (Observation and Patient)",
        );

        const includedPatient = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Patient"
        );
        assertExists(
            includedPatient,
            "Bundle should include the referenced Patient",
        );
        assertEquals(
            includedPatient.search?.mode,
            "include",
            "Included Patient should have search mode set to 'include'",
        );
    });

    it("Should include referencing resources with _revinclude", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_id=${patient.id}&_revinclude=Observation:subject`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (Patient and Observation)",
        );

        const includedObservation = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Observation"
        );
        assertExists(
            includedObservation,
            "Bundle should include the referencing Observation",
        );
        assertEquals(
            includedObservation.search?.mode,
            "include",
            "Included Observation should have search mode set to 'include'",
        );
    });

    it("Should support wildcard _include", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}&_revinclude=*`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 2,
            "Bundle should contain more than 2 entries (Patient and referencing resources)",
        );

        const hasObservation = bundle.entry.some((entry) =>
            entry.resource?.resourceType === "Observation"
        );
        const hasMedicationRequest = bundle.entry.some((entry) =>
            entry.resource?.resourceType === "MedicationRequest"
        );
        assertTrue(
            hasObservation,
            "Bundle should include referencing Observation",
        );
        assertTrue(
            hasMedicationRequest,
            "Bundle should include referencing MedicationRequest",
        );
    });

    it("Should support _include with specific target type", async () => {
        const practitioner = await createTestPractitioner(context, {
            name: { given: ["TestPractitioner"] },
        });
        const medicationRequest = await createTestMedicationRequest(
            context,
            (await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            })).id!,
            {
                status: "active",
                requester: { reference: `Practitioner/${practitioner.id}` },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?_id=${medicationRequest.id}&_include=MedicationRequest:requester:Practitioner`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (MedicationRequest and Practitioner)",
        );

        const includedPractitioner = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Practitioner"
        );
        assertExists(
            includedPractitioner,
            "Bundle should include the referenced Practitioner",
        );
        assertEquals(
            includedPractitioner.search?.mode,
            "include",
            "Included Practitioner should have search mode set to 'include'",
        );
    });

    it("Should support iterative _include", async () => {
        const practitioner = await createTestPractitioner(context, {
            name: { given: ["TestPractitioner"] },
        });
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                requester: { reference: `Practitioner/${practitioner.id}` },
                medicationCodeableConcept: {
                    coding: [{ system: "http://example.org", code: "med1" }],
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?_id=${medicationRequest.id}&_include=MedicationRequest:requester&_include=MedicationRequest:subject`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain 3 entries (MedicationRequest, Practitioner, and Patient)",
        );

        const includedPractitioner = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Practitioner"
        );
        const includedPatient = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Patient"
        );
        assertExists(
            includedPractitioner,
            "Bundle should include the referenced Practitioner",
        );
        assertExists(
            includedPatient,
            "Bundle should include the referenced Patient",
        );
    });
}
