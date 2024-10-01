// tests/search/parameters/type_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTypeParameterTests(context: ITestContext) {
    it("Should filter resources by single type", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Observation`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _type parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            bundle.entry.every((entry) =>
                entry.resource?.resourceType === "Observation"
            ),
            "All entries should be Observations",
        );
    });

    it("Should filter resources by multiple types", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Observation,Condition`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _type parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 2,
            "Bundle should contain at least two entries",
        );
        assertTrue(
            bundle.entry.every((entry) =>
                ["Observation", "Condition"].includes(
                    entry.resource?.resourceType as string,
                )
            ),
            "All entries should be either Observations or Conditions",
        );
    });

    it("Should combine _type with other search parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Observation&patient=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _type with other parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            bundle.entry[0].resource?.resourceType,
            "Observation",
            "The entry should be an Observation",
        );
        assertEquals(
            (bundle.entry[0].resource as Observation).subject?.reference,
            `Patient/${patient.id}`,
            "The Observation should be for the correct patient",
        );
    });

    it("Should return empty result for non-existent resource type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=NonExistentResourceType`,
        });

        assertEquals(
            response.status,
            400,
            "Server should return 400 for non-existent resource type",
        );
    });

    it("Should handle case-insensitive resource type", async () => {
        await createTestObservation(context, context.getValidPatientId(), {
            code: "test-code",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=observation`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process case-insensitive _type parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            bundle.entry.every((entry) =>
                entry.resource?.resourceType === "Observation"
            ),
            "All entries should be Observations",
        );
    });

    it("Should handle _type with search parameters specific to one resource type", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });
        const condition = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    code: "active",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Observation,Condition&clinical-status=active`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _type with type-specific parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            bundle.entry[0].resource?.resourceType,
            "Condition",
            "The entry should be a Condition",
        );
        assertEquals(
            (bundle.entry[0].resource as Condition).id,
            condition.id,
            "The Condition should be the one with active clinical status",
        );
    });
}
