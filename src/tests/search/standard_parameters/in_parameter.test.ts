// tests/search/parameters/in_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCareTeam,
    createTestCondition,
    createTestEncounter,
    createTestGroup,
    createTestList,
    createTestMedication,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Condition,
    Encounter,
    Medication,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runInParameterTests(context: ITestContext) {
    it("Should find resources in a Group", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });

        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
            member: [
                { entity: { reference: `Patient/${patient1.id}` } },
                { entity: { reference: `Patient/${patient2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_in=Group/${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient1.id
            ),
            "Bundle should contain patient1",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient2.id
            ),
            "Bundle should contain patient2",
        );
    });

    it("Should find Conditions in a List", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const condition1 = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
        });
        const condition2 = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const list = await createTestList(context, {
            status: "current",
            mode: "working",
            entry: [
                { item: { reference: `Condition/${condition1.id}` } },
                { item: { reference: `Condition/${condition2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?_in=List/${list.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Condition).id === condition1.id
            ),
            "Bundle should contain condition1",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Condition).id === condition2.id
            ),
            "Bundle should contain condition2",
        );
    });

    it("Should find Patients which are participants of a CareTeam", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });

        const careTeam = await createTestCareTeam(context, {
            status: "active",
            participant: [
                { member: { reference: `Patient/${patient1.id}` } },
                { member: { reference: `Patient/${patient2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_in=CareTeam/${careTeam.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient1.id
            ),
            "Bundle should contain patient1",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient2.id
            ),
            "Bundle should contain patient2",
        );
    });

    it("Should find Encounters for Patients in a Group", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });
        const encounter1 = await createTestEncounter(context, {
            subject: { reference: `Patient/${patient1.id}` },
        });
        const encounter2 = await createTestEncounter(context, {
            subject: { reference: `Patient/${patient2.id}` },
        });

        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
            member: [
                { entity: { reference: `Patient/${patient1.id}` } },
                { entity: { reference: `Patient/${patient2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Encounter?patient._in=Group/${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter with chaining successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Encounter).id === encounter1.id
            ),
            "Bundle should contain encounter1",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Encounter).id === encounter2.id
            ),
            "Bundle should contain encounter2",
        );
    });

    it("Should find Medications not in an allergy List", async () => {
        const medication1 = await createTestMedication(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "372897005",
                }],
            },
        });
        const medication2 = await createTestMedication(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "372894002",
                }],
            },
        });

        const allergyList = await createTestList(context, {
            status: "current",
            mode: "working",
            entry: [
                { item: { reference: `Medication/${medication1.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Medication?code:below=http://snomed.info/sct|90000002&_in:not=List/${allergyList.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in:not parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Medication).id,
            medication2.id,
            "Bundle should contain medication2",
        );
    });

    it("Should not return inactive or excluded members", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });

        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
            member: [
                {
                    entity: { reference: `Patient/${patient1.id}` },
                    inactive: false,
                },
                {
                    entity: { reference: `Patient/${patient2.id}` },
                    inactive: true,
                },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_in=Group/${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient1.id,
            "Bundle should only contain active patient1",
        );
    });
}
