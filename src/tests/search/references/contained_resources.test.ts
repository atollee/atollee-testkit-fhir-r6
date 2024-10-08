// tests/search/parameters/contained_resources.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestMedicationRequest,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, Medication, MedicationRequest } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { Context } from "https://deno.land/x/oak@14.2.0/mod.ts";

export function runContainedResourcesTests(context: ITestContext) {
    if (context.isHapiBugsDisallowed()) {
        it("Should find MedicationRequest with contained Medication using chained search", async () => {
            const patient = await createTestPatient(
                context,
            );
            const code = uniqueString("abc");
            const medicationRequest = await createTestMedicationRequest(
                context,
                patient.id!,
                {
                    containedMedication: {
                        resourceType: "Medication",
                        id: "m1",
                        ingredient: [{
                            itemCodeableConcept: {
                                coding: [{
                                    system: "http://example.org/medications",
                                    code,
                                }],
                            },
                        }],
                    },
                },
            );

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `MedicationRequest?medication.ingredient-code=abc`,
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
                1,
                "Bundle should contain 1 entry",
            );
            assertEquals(
                (bundle.entry[0].resource as MedicationRequest).id,
                medicationRequest.id,
                "Bundle should contain the correct MedicationRequest",
            );
        });
    }

    it("Should not find contained Medication when searching directly", async () => {
        const patient = await createTestPatient(
            context,
        );
        await createTestMedicationRequest(context, patient.id!, {
            containedMedication: {
                resourceType: "Medication",
                id: "m1",
                ingredient: [{
                    itemCodeableConcept: {
                        coding: [{
                            system: "http://example.org/medications",
                            code: "abc",
                        }],
                    },
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Medication?ingredient-code=abc`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    if (context.isContainedSearchesSupported()) {
        it("Should return contained Medication when using _contained=true and _containedType=contained", async () => {
            const patient = await createTestPatient(
                context,
            );
            await createTestMedicationRequest(context, patient.id!, {
                containedMedication: {
                    resourceType: "Medication",
                    id: "m1",
                    ingredient: [{
                        itemCodeableConcept: {
                            coding: [{
                                system: "http://example.org/medications",
                                code: "abc",
                            }],
                        },
                    }],
                },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Medication?ingredient-code=abc&_contained=true&_containedType=contained`,
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
                1,
                "Bundle should contain 1 entry",
            );

            const medication = bundle.entry[0].resource as Medication;
            assertEquals(
                medication.resourceType,
                "Medication",
                "Returned resource should be a Medication",
            );
            assertEquals(
                medication.id,
                "m1",
                "Returned Medication should have the correct id",
            );

            assertTrue(
                bundle.entry[0].fullUrl?.includes("#m1"),
                "fullUrl should include the contained resource id",
            );
            assertEquals(
                bundle.entry[0].search?.mode,
                "match",
                "search mode should be 'match'",
            );
        });

        it("Should return container MedicationRequest when using _contained=true and _containedType=container", async () => {
            const patient = await createTestPatient(
                context,
            );
            const medicationRequest = await createTestMedicationRequest(
                context,
                patient.id!,
                {
                    containedMedication: {
                        resourceType: "Medication",
                        id: "m1",
                        ingredient: [{
                            itemCodeableConcept: {
                                coding: [{
                                    system: "http://example.org/medications",
                                    code: "abc",
                                }],
                            },
                        }],
                    },
                },
            );

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Medication?ingredient-code=abc&_contained=true&_containedType=container`,
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
                1,
                "Bundle should contain 1 entry",
            );

            const returnedMedicationRequest = bundle.entry[0]
                .resource as MedicationRequest;
            assertEquals(
                returnedMedicationRequest.resourceType,
                "MedicationRequest",
                "Returned resource should be a MedicationRequest",
            );
            assertEquals(
                returnedMedicationRequest.id,
                medicationRequest.id,
                "Returned MedicationRequest should have the correct id",
            );

            assertExists(
                returnedMedicationRequest.contained,
                "MedicationRequest should contain a Medication",
            );
            assertEquals(
                returnedMedicationRequest.contained[0].resourceType,
                "Medication",
                "Contained resource should be a Medication",
            );
            assertEquals(
                returnedMedicationRequest.contained[0].id,
                "m1",
                "Contained Medication should have the correct id",
            );

            assertEquals(
                bundle.entry[0].search?.mode,
                "match",
                "search mode should be 'match'",
            );
        });
    }
}
