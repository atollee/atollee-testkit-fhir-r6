// tests/search/parameters/elements.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { Context } from "https://deno.land/x/oak@14.2.0/mod.ts";

export function runElementsTests(context: ITestContext) {
    if (context.isElementSearchParameterSupported()) {
        it("Should return only specified elements plus mandatory elements", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
                active: true,
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_elements=name,gender`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );

            const returnedPatient = response.jsonBody as Patient;

            // Mandatory elements should always be present
            assertExists(returnedPatient.id, "Should include mandatory id");
            assertExists(returnedPatient.meta, "Should include mandatory meta");

            // Check for SUBSETTED tag
            assertTrue(
                returnedPatient.meta?.tag?.some((tag) =>
                    tag.system ===
                        "http://terminology.hl7.org/CodeSystem/v3-ObservationValue" &&
                    tag.code === "SUBSETTED"
                ),
                "Resource should be marked as SUBSETTED",
            );

            // Requested elements should be present
            assertExists(
                returnedPatient.name,
                "Should include requested name element",
            );
            assertExists(
                returnedPatient.gender,
                "Should include requested gender element",
            );

            // Non-requested elements should be absent
            assertEquals(
                returnedPatient.birthDate,
                undefined,
                "Should not include non-requested birthDate",
            );
        });

        it("Should return mandatory elements even if not specified", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_elements=gender`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(
                returnedPatient.id,
                "Returned patient should include id (mandatory)",
            );
            assertExists(
                returnedPatient.gender,
                "Returned patient should include gender (requested)",
            );
            assertExists(
                returnedPatient.resourceType,
                "Returned patient should include resourceType (mandatory)",
            );
        });

        it("Should mark resources with SUBSETTED tag when using _elements", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_elements=name,gender`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(
                returnedPatient.meta?.tag,
                "Returned patient should have tags",
            );
            assertTrue(
                returnedPatient.meta!.tag!.some((tag) =>
                    tag.code === "SUBSETTED"
                ),
                "Returned patient should be marked with SUBSETTED tag",
            );
        });

        it("Should apply _elements restrictions to included resources while preserving mandatory elements", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const observation = await createTestObservation(
                context,
                patient.id!,
                {
                    code: "test-code",
                    status: "final",
                    valueQuantity: { value: 100, unit: "mg" },
                },
            );

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?_id=${observation.id}&_include=Observation:subject&_elements=Observation.code,Patient.name`,
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

            const returnedObservation = bundle.entry.find((entry) =>
                entry.resource?.resourceType === "Observation"
            )?.resource as Observation;

            // Mandatory elements must be present
            assertExists(returnedObservation.id, "Should include mandatory id");
            assertExists(
                returnedObservation.meta,
                "Should include mandatory meta",
            );
            assertExists(
                returnedObservation.status,
                "Should include mandatory status",
            );

            // Requested elements should be present
            assertExists(
                returnedObservation.code,
                "Should include requested code element",
            );

            // Non-mandatory, non-requested elements should be absent
            assertEquals(
                returnedObservation.valueQuantity,
                undefined,
                "Should not include non-requested valueQuantity",
            );

            const returnedPatient = bundle.entry.find((entry) =>
                entry.resource?.resourceType === "Patient"
            )?.resource as Patient;

            // Mandatory elements for Patient
            assertExists(returnedPatient.id, "Should include mandatory id");
            assertExists(returnedPatient.meta, "Should include mandatory meta");
            assertExists(
                returnedPatient.active,
                "Should include modifier element active",
            );

            // Requested elements
            assertExists(
                returnedPatient.name,
                "Should include requested name element",
            );

            // Non-mandatory, non-modifier, non-requested elements should be absent
            assertEquals(
                returnedPatient.gender,
                undefined,
                "Should not include non-requested gender",
            );
            assertEquals(
                returnedPatient.birthDate,
                undefined,
                "Should not include non-requested birthDate",
            );

            // Both resources should be marked as subsetted
            assertTrue(
                returnedObservation.meta?.tag?.some((tag) =>
                    tag.system ===
                        "http://terminology.hl7.org/CodeSystem/v3-ObservationValue" &&
                    tag.code === "SUBSETTED"
                ),
                "Observation should be marked as SUBSETTED",
            );
            assertTrue(
                returnedPatient.meta?.tag?.some((tag) =>
                    tag.system ===
                        "http://terminology.hl7.org/CodeSystem/v3-ObservationValue" &&
                    tag.code === "SUBSETTED"
                ),
                "Patient should be marked as SUBSETTED",
            );
        });

        it("Should handle _elements with [x] elements correctly", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });
            const observation = await createTestObservation(
                context,
                patient.id!,
                {
                    code: "test-code",
                    status: "final",
                    valueQuantity: { value: 100, unit: "mg" },
                },
            );

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation/${observation.id}?_elements=code,value`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedObservation = response.jsonBody as Observation;
            assertExists(
                returnedObservation.code,
                "Returned observation should include code",
            );
            assertExists(
                returnedObservation.valueQuantity,
                "Returned observation should include valueQuantity",
            );
            assertEquals(
                returnedObservation.status,
                observation.status,
                "Returned observation should include status as a mandatory element",
            );
        });
    }
}
