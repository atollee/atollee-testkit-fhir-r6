// tests/search/parameters/reverse_chaining.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestAuditEvent,
    createTestEncounter,
    createTestGroup,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runReverseChainedParametersTests(context: ITestContext) {
    it("Should find Patients with a specific Observation code", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "ForObservation" }],
        });

        await createTestObservation(context, patient.id!, {
            code: "1234-5",
            system: "http://loinc.org",
            status: "final",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Observation:patient:code=1234-5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process reverse chained parameter search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Results should include the patient referenced by the Observation",
        );
    });

    it("Should handle 'OR' searches in _has parameter", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"], family: "ForObservation" }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"], family: "ForObservation" }],
        });

        await createTestObservation(context, patient1.id!, {
            code: "123",
            system: "http://loinc.org",
            status: "final",
        });

        await createTestObservation(context, patient2.id!, {
            code: "456",
            system: "http://loinc.org",
            status: "final",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Observation:patient:code=123,456`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process 'OR' search in _has parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Results should include both patients",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient1.id
            ),
            "Results should include patient1",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient2.id
            ),
            "Results should include patient2",
        );
    });

    it("Should handle multiple _has parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{
                given: ["TestPatient"],
                family: "ForMultipleObservations",
            }],
        });

        await createTestObservation(context, patient.id!, {
            code: "123",
            system: "http://loinc.org",
            status: "final",
        });

        await createTestObservation(context, patient.id!, {
            code: "456",
            system: "http://loinc.org",
            status: "final",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Observation:patient:code=123&_has:Observation:patient:code=456`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _has parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Results should include only one patient",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Results should include the patient referenced by both Observations",
        );
    });

    it("Should handle nested _has parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "ForNestedHas" }],
        });

        const observation = await createTestObservation(context, patient.id!, {
            status: "final",
        });

        await createTestAuditEvent(context, {
            entity: [{ reference: `Observation/${observation.id}` }],
            agent: [{ who: { identifier: { value: "MyUserId" } } }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_has:Observation:patient:_has:AuditEvent:entity:agent.identifier=MyUserId`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process nested _has parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Results should include only one patient",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Results should include the patient referenced by the Observation with the specific AuditEvent",
        );
    });

    it("Should handle _has parameter in chained-searches", async () => {
        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
        });

        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "ForGroupMembership" }],
        });

        await fetchWrapper({
            authorized: true,
            method: "PUT",
            relativeUrl: `Group/${group.id}`,
            body: JSON.stringify({
                ...group,
                member: [{ entity: { reference: `Patient/${patient.id}` } }],
            }),
        });

        const encounter = await createTestEncounter(context, {
            status: "finished",
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Encounter?patient._has:Group:member:_id=${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has parameter in chained-search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Results should include only one encounter",
        );
        assertEquals(
            (bundle.entry[0].resource as Encounter).id,
            encounter.id,
            "Results should include the encounter for the patient who is a member of the specified group",
        );
    });
}
