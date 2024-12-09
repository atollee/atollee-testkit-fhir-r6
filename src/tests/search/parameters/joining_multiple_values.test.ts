// tests/search/parameters/joining_multiple_values.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestAllergyIntolerance,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { AllergyIntolerance, Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runJoiningMultipleValuesTests(context: ITestContext) {
    it("AND, Array, Simple: Intersection of records that contain at least one match for each search criteria", async () => {
        const patient = await createTestPatient(context, {});

        // Create allergy with both categories
        const allergy1 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                category: ["medication", "biologic"],
            },
        );

        // Create allergy with only medication category
        const allergy2 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                category: ["medication"],
            },
        );

        // Create allergy with only biologic category
        const allergy3 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                category: ["biologic"],
            },
        );

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?category=medication&category=biologic`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process AND join search successfully",
        );

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching AllergyIntolerance that has both categories",
        );

        const allergy = bundle.entry[0].resource as AllergyIntolerance;
        assertEquals(
            allergy.id,
            allergy1.id,
            "Should return only the allergy that has both medication and biologic categories",
        );

        // Verify the returned allergy has both required categories
        assertExists(
            allergy.category,
            "Returned allergy should have categories",
        );
        assertTrue(
            allergy.category.includes("medication") &&
                allergy.category.includes("biologic"),
            "Returned allergy should contain both medication and biologic categories",
        );
    });

    it("OR, Array, Simple: Union of records that contain at least one match for each search criteria", async () => {
        const patient = await createTestPatient(context, {});
        const allergy1 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "active",
                        },
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "resolved",
                        },
                    ],
                },
            },
        );
        const allergy2 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "active",
                        },
                    ],
                },
            },
        );
        const allergy3 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "resolved",
                        },
                    ],
                },
            },
        );
        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "inactive",
                    },
                ],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `AllergyIntolerance?clinical-status=active,resolved`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process OR join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching AllergyIntolerances",
        );
        const allergyIds = bundle.entry.map((entry) =>
            (entry.resource as AllergyIntolerance).id
        );
        assertTrue(
            allergyIds.includes(allergy1.id),
            "Results should include allergy with both clinical statuses",
        );
        assertTrue(
            allergyIds.includes(allergy2.id),
            "Results should include allergy with active status",
        );
        assertTrue(
            allergyIds.includes(allergy3.id),
            "Results should include allergy with resolved status",
        );
    });

    it("AND, Array, Simple: Should return empty result when ANDing mutually exclusive values", async () => {
        const patient = await createTestPatient(context, {});

        // Create test allergies
        const activeAllergy = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [{
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    }],
                },
            },
        );

        await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [{
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "resolved",
                    }],
                },
            },
        );

        // This search should return no results since a clinicalStatus cannot be both active AND resolved
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?clinical-status=active&clinical-status=resolved`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process AND join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries array");
        assertEquals(
            bundle.entry.length,
            0,
            "Bundle should contain no matches since clinicalStatus cannot be both active and resolved",
        );

        // To demonstrate OR behavior, test with comma-separated values
        const orResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `AllergyIntolerance?clinical-status=active,resolved`,
        });

        assertEquals(orResponse.status, 200);
        const orBundle = orResponse.jsonBody as Bundle;
        assertExists(orBundle.entry, "Bundle should contain entries");
        assertEquals(
            orBundle.entry.length,
            2,
            "Bundle should contain both allergies when using OR",
        );
    });

    it("OR, Array, Simple: Union of records that contain at least one match for each search criteria", async () => {
        const patient = await createTestPatient(context, {});
        const allergy1 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "active",
                        },
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "resolved",
                        },
                    ],
                },
            },
        );
        const allergy2 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "active",
                        },
                    ],
                },
            },
        );
        const allergy3 = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {
                clinicalStatus: {
                    coding: [
                        {
                            system:
                                "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                            code: "resolved",
                        },
                    ],
                },
            },
        );
        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "inactive",
                    },
                ],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `AllergyIntolerance?clinical-status=active,resolved`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process OR join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching AllergyIntolerances",
        );
        const allergyIds = bundle.entry.map((entry) =>
            (entry.resource as AllergyIntolerance).id
        );
        assertTrue(
            allergyIds.includes(allergy1.id),
            "Results should include allergy with both clinical statuses",
        );
        assertTrue(
            allergyIds.includes(allergy2.id),
            "Results should include allergy with active status",
        );
        assertTrue(
            allergyIds.includes(allergy3.id),
            "Results should include allergy with resolved status",
        );
    });

    it("AND, Array, Complex: Intersection of records that contain at least one match for each search criteria", async () => {
        const uniqueValueA = uniqueString("valueA");
        const uniqueValueB = uniqueString("valueB");
        const patient1 = await createTestPatient(context, {
            name: [{ given: [uniqueValueA, uniqueValueB] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: [uniqueValueA], family: uniqueValueB }],
        });
        await createTestPatient(context, { name: [{ given: [uniqueValueA] }] });
        await createTestPatient(context, { name: [{ family: uniqueValueB }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueValueA}&name=${uniqueValueB}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process AND join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two matching Patients",
        );
        const patientIds = bundle.entry.map((entry) =>
            (entry.resource as Patient).id
        );
        assertTrue(
            patientIds.includes(patient1.id),
            "Results should include patient with both values in given name",
        );
        assertTrue(
            patientIds.includes(patient2.id),
            "Results should include patient with values in given and family name",
        );
    });

    it("OR, Array, Complex: Union of records that contain at least one match for any search criteria", async () => {
        const uniqueValueA = uniqueString("valueA");
        const uniqueValueB = uniqueString("valueB");
        const patient1 = await createTestPatient(context, {
            name: [{ given: [uniqueValueA] }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ family: uniqueValueB }],
        });
        const patient3 = await createTestPatient(context, {
            name: [{ given: [uniqueValueA], family: uniqueValueB }],
        });
        await createTestPatient(context, { name: [{ given: ["OtherValue"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueValueA},${uniqueValueB}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process OR join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching Patients",
        );
        const patientIds = bundle.entry.map((entry) =>
            (entry.resource as Patient).id
        );
        assertTrue(
            patientIds.includes(patient1.id),
            "Results should include patient with valueA in given name",
        );
        assertTrue(
            patientIds.includes(patient2.id),
            "Results should include patient with valueB in family name",
        );
        assertTrue(
            patientIds.includes(patient3.id),
            "Results should include patient with both values",
        );
    });
}
