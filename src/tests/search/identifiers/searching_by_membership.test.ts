// tests/search/membership/searching_by_membership.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestGroup,
    createTestList,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchingByMembershipTests(context: ITestContext) {
    it("Should search for patients in a group using _in parameter", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ family: "TestPatient1" }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ family: "TestPatient2" }],
        });
        const patient3 = await createTestPatient(context, {
            name: [{ family: "TestPatient3" }],
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
            relativeUrl: `Patient?_in=${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 patients in the group",
        );

        const patientIds = bundle.entry.map((entry) =>
            (entry.resource as Patient).id
        );
        assertEquals(
            patientIds.includes(patient1.id),
            true,
            "Should include patient1",
        );
        assertEquals(
            patientIds.includes(patient2.id),
            true,
            "Should include patient2",
        );
        assertEquals(
            patientIds.includes(patient3.id),
            false,
            "Should not include patient3",
        );
    });

    it("Should search for conditions in a list using _list parameter", async () => {
        const patient = await createTestPatient(context, {
            name: [{ family: "TestPatient" }],
        });
        const condition1 = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://example.com/condition-codes",
                    code: "COND1",
                    display: "Condition1",
                }],
            },
        });
        const condition2 = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://example.com/condition-codes",
                    code: "COND2",
                    display: "Condition2",
                }],
            },
        });
        const condition3 = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://example.com/condition-codes",
                    code: "COND3",
                    display: "Condition3",
                }],
            },
        });

        const list = await createTestList(context, {
            status: "current",
            mode: "working",
            title: "Test Condition List",
            entry: [
                { item: { reference: `Condition/${condition1.id}` } },
                { item: { reference: `Condition/${condition2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?_list=${list.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 conditions in the list",
        );

        const conditionIds = bundle.entry.map((entry) =>
            (entry.resource as Condition).id
        );
        assertEquals(
            conditionIds.includes(condition1.id),
            true,
            "Should include condition1",
        );
        assertEquals(
            conditionIds.includes(condition2.id),
            true,
            "Should include condition2",
        );
        assertEquals(
            conditionIds.includes(condition3.id),
            false,
            "Should not include condition3",
        );
    });

    it("Should combine _in search with additional criteria", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ family: "TestPatient1" }],
            gender: "male",
        });
        const patient2 = await createTestPatient(context, {
            name: [{ family: "TestPatient2" }],
            gender: "female",
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
            relativeUrl: `Patient?_in=${group.id}&gender=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process combined _in and criteria search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 male patient in the group",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient1.id,
            "Should be the male patient",
        );
    });

    it("Should handle _list search with empty list", async () => {
        const emptyList = await createTestList(context, {
            status: "current",
            mode: "working",
            title: "Empty Test List",
            entry: [],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_list=${emptyList.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list search on empty list successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.total,
            0,
            "Should find 0 patients in the empty list",
        );
    });
}
