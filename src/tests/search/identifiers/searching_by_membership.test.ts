// tests/search/membership/searching_by_membership.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestGroup,
    createTestList,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Condition,
    Observation,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchingByMembershipTests(context: ITestContext) {
    if (context.isHapiBugsDisallowed()) {
        it("Should search for Observations in a Patient compartment using _in parameter", async () => {
            // Create a test patient
            const patient = await createTestPatient(context, {
                name: [{ family: "TestPatient" }],
            });

            // Create observations for this patient
            const observation1 = await createTestObservation(
                context,
                patient.id!,
                {
                    subject: { reference: `Patient/${patient.id}` },
                    code: "15074-8",
                    system: "http://loinc.org",
                    valueQuantity: {
                        value: 6.3,
                        unit: "mmol/l",
                        system: "http://unitsofmeasure.org",
                        code: "mmol/L",
                    },
                },
            );

            const observation2 = await createTestObservation(
                context,
                patient.id!,
                {
                    subject: { reference: `Patient/${patient.id}` },
                    system: "http://loinc.org",
                    code: "8867-4",
                    valueQuantity: {
                        value: 80,
                        unit: "beats/minute",
                        system: "http://unitsofmeasure.org",
                        code: "/min",
                    },
                },
            );

            // Create an observation for a different patient
            const otherPatient = await createTestPatient(context, {
                name: [{ family: "OtherPatient" }],
            });
            const otherObservation = await createTestObservation(
                context,
                patient.id!,
                {
                    subject: { reference: `Patient/${otherPatient.id}` },
                    code: "8867-4",
                    system: "http://loinc.org",
                    valueQuantity: {
                        value: 70,
                        unit: "beats/minute",
                        system: "http://unitsofmeasure.org",
                        code: "/min",
                    },
                },
            );

            // Perform the search using _in parameter
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_in=Patient/${patient.id}`,
            });

            // Assertions
            assertEquals(
                response.status,
                200,
                "Server should process _in compartment search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Should find 2 observations in the patient compartment",
            );

            const observationIds = bundle.entry.map((entry) =>
                (entry.resource as Observation).id
            );
            assertTrue(
                observationIds.includes(observation1.id),
                "Should include observation1",
            );
            assertTrue(
                observationIds.includes(observation2.id),
                "Should include observation2",
            );
            assertFalse(
                observationIds.includes(otherObservation.id),
                "Should not include the observation from a different patient",
            );

            // Additional check to ensure all returned observations belong to the correct patient
            bundle.entry.forEach((entry) => {
                const obs = entry.resource as Observation;
                assertEquals(
                    obs.subject?.reference,
                    `Patient/${patient.id}`,
                    "All returned observations should reference the correct patient",
                );
            });
        });
    }

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

        const response = await fetchSearchWrapper({
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

        const response = await fetchSearchWrapper({
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

        const response = await fetchSearchWrapper({
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
