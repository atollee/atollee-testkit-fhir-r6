import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestObservation,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    OperationDefinition,
    Parameters,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runQueryParameterTests(context: ITestContext) {
    it("Should execute $everything operation successfully", async () => {
        // Create some test data
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestEncounter(context, {
            subject: { reference: `Patient/${patient.id}` },
            status: "in-progress",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/$everything`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process $everything operation successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Patient"
            ) &&
                bundle.entry.some((entry) =>
                    entry.resource?.resourceType === "Encounter"
                ),
            "Bundle should contain Patient and related resources",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should execute $lastn operation with additional parameters", async () => {
            const patient = await createTestPatient(context, {});
            for (let i = 0; i < 5; i++) {
                await createTestObservation(context, patient.id!, {
                    code: "8867-4",
                    system: "http://loinc.org",
                    valueQuantity: { value: 70 + i, unit: "beats/min" },
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation/$lastn?patient=${patient.id}&max=3`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process $lastn with additional parameters successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                "Bundle should contain exactly 3 entries",
            );
        });
    }

    it("Should reject request with unrecognized operation name", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/$non-existent-operation`,
        });

        assertTrue(
            response.status >= 400,
            "Server should reject request with unrecognized operation name",
        );
    });

    if (context.isMultiTypeSearchSupported()) {
        it("Should execute $validate operation on multiple resource types", async () => {
            const patientToValidate = {
                resourceType: "Patient",
                name: [{ given: ["John"], family: "Doe" }],
            };

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/$validate`,
                method: "POST",
                headers: { "Content-Type": "application/fhir+json" },
                body: JSON.stringify(patientToValidate),
            });

            assertEquals(
                response.status,
                200,
                "Server should process $validate operation successfully",
            );
            const parameters = response.jsonBody as Parameters;
            assertExists(
                parameters.parameter,
                "Parameters should contain parameter",
            );
            const outcome = parameters.parameter.find((p) =>
                p.name === "outcome"
            )
                ?.resource;
            assertExists(
                outcome,
                "Parameters should contain an OperationOutcome",
            );
            assertEquals(
                outcome.resourceType,
                "OperationOutcome",
                "Outcome should be an OperationOutcome",
            );
        });
    }
}
