// tests/search/parameters/has_parameter.test.ts

import {
    assertEquals,
    assertExists, it
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestEncounter,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    Bundle, Patient
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runHasParameterTests(context: ITestContext) {
    it("Should find Patients with specific Observations using _has", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });

        await createTestObservation(context, patient1.id!, {
            code: "test-code-1",
        });
        await createTestObservation(context, patient2.id!, {
            code: "test-code-2",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Observation:patient:code=test-code-1`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient1.id,
            "Found Patient should be patient1",
        );
    });

    it("Should support multiple _has parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        await createTestObservation(context, patient.id!, {
            code: "test-code-1",
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "test-condition",
                    display: "Test Condition",
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Observation:patient:code=test-code-1&_has:Condition:subject:code=test-condition`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _has parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Found Patient should be the correct patient",
        );
    });

    it("Should support nested _has parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const encounter = await createTestEncounter(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        await createTestObservation(context, patient.id!, {
            encounter: { reference: `Encounter/${encounter.id}` },
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Encounter:patient:_has:Observation:encounter:code=test-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process nested _has parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Found Patient should be the correct patient",
        );
    });

    it("Should support _has with other search parameters", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
            gender: "male",
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
            gender: "female",
        });

        await createTestObservation(context, patient1.id!, {
            code: "test-code",
        });
        await createTestObservation(context, patient2.id!, {
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Observation:patient:code=test-code&gender=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has with other parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient1.id,
            "Found Patient should be patient1",
        );
    });

    it("Should return no results when _has condition is not met", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Observation:patient:code=non-existent-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });
}
