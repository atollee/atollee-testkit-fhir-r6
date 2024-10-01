// tests/search/parameters/list_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestAllergyIntolerance,
    createTestCondition,
    createTestList,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runListParameterTests(context: ITestContext) {
    it("Should find resources referenced by a specific List", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
        });

        const list = await createTestList(context, {
            title: "Test List",
            entry: [
                { item: { reference: `Patient/${patient1.id}` } },
                { item: { reference: `Patient/${patient2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_list=${list.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
    });

    it("Should find Conditions referenced by a specific List", async () => {
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
            title: "Condition List",
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
            "Server should process _list parameter for Conditions successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two Condition entries",
        );
    });

    it("Should combine _list with other search parameters", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["TestPatient1"] }],
            gender: "female",
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["TestPatient2"] }],
            gender: "male",
        });

        const list = await createTestList(context, {
            title: "Patient List",
            entry: [
                { item: { reference: `Patient/${patient1.id}` } },
                { item: { reference: `Patient/${patient2.id}` } },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_list=${list.id}&gender=female`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list parameter with additional parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Patient).gender,
            "female",
            "Returned Patient should be female",
        );
    });

    it("Should handle functional list for current allergies", async () => {
        // We don't need to create a new patient here, as createTestAllergyIntolerance
        // uses the valid patient ID from the context
        const allergyIntolerance = await createTestAllergyIntolerance(context);

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?patient=${context.getValidPatientId()}&_list=$current-allergies`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process functional _list parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );

        // Optionally, verify that the created AllergyIntolerance is in the result
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.id === allergyIntolerance.id
            ),
            "Bundle should contain the created AllergyIntolerance",
        );
    });

    it("Should return empty result for non-existent List", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_list=non-existent-list-id`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list parameter with non-existent List successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });
}
