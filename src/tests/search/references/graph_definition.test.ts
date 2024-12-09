// tests/search/parameters/graph_definition.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestGraphDefinition,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, GraphDefinition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runGraphDefinitionTests(context: ITestContext) {
    if (context.isGraphSearchParameterSupported()) {
        it("Should include resources based on GraphDefinition when using _graph", async () => {
            const graphDefinition = await createTestGraphDefinition(context, {
                name: "patient-with-observations-and-conditions",
                start: "Patient",
                link: [
                    {
                        path: "Patient",
                        target: [
                            {
                                type: "Observation",
                                params: "patient=$this",
                            },
                            {
                                type: "Condition",
                                params: "subject=$this",
                            },
                        ],
                    },
                ],
            });

            assertExists(
                graphDefinition.id,
                "GraphDefinition should be created with an ID",
            );
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });
            await createTestObservation(context, patient.id!, {
                code: "test-code",
            });
            await createTestCondition(context, {
                subject: { reference: `Patient/${patient.id}` },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?_id=${patient.id}&_graph=${graphDefinition.id}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length >= 3,
                "Bundle should contain at least 3 entries (Patient, Observation, and Condition)",
            );

            const includedPatient = bundle.entry.find((entry) =>
                entry.resource?.resourceType === "Patient"
            );
            const includedObservation = bundle.entry.find((entry) =>
                entry.resource?.resourceType === "Observation"
            );
            const includedCondition = bundle.entry.find((entry) =>
                entry.resource?.resourceType === "Condition"
            );

            assertExists(includedPatient, "Bundle should include the Patient");
            assertExists(
                includedObservation,
                "Bundle should include the Observation",
            );
            assertExists(
                includedCondition,
                "Bundle should include the Condition",
            );
        });

        it("Should handle _graph parameter with non-existent GraphDefinition", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?_id=${patient.id}&_graph=non-existent-graph`,
            });

            assertEquals(
                response.status,
                400,
                "Server should return a 400 Bad Request for non-existent GraphDefinition",
            );
        });

        it("Should handle _graph parameter with invalid GraphDefinition reference", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?_id=${patient.id}&_graph=InvalidReference`,
            });

            assertEquals(
                response.status,
                400,
                "Server should return a 400 Bad Request for invalid GraphDefinition reference",
            );
        });
    }
}
