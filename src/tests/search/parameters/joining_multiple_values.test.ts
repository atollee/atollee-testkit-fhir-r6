// tests/search/parameters/joining_multiple_values.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
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
        const allergy1 = await createTestAllergyIntolerance(context, {
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
        });
        const allergy2 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    },
                ],
            },
        });
        const allergy3 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "resolved",
                    },
                ],
            },
        });

        const response = await fetchWrapper({
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
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching AllergyIntolerance",
        );
        const allergy = bundle.entry[0].resource as AllergyIntolerance;
        assertEquals(
            allergy.id,
            allergy1.id,
            "Returned allergy should have both clinical statuses",
        );
    });

    it("OR, Array, Simple: Union of records that contain at least one match for each search criteria", async () => {
        const allergy1 = await createTestAllergyIntolerance(context, {
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
        });
        const allergy2 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    },
                ],
            },
        });
        const allergy3 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "resolved",
                    },
                ],
            },
        });
        await createTestAllergyIntolerance(context, {
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

        const response = await fetchWrapper({
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

    it("AND, Array, Simple: Intersection of records that contain at least one match for each search criteria", async () => {
        const allergy1 = await createTestAllergyIntolerance(context, {
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
        });
        await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    },
                ],
            },
        });
        await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "resolved",
                    },
                ],
            },
        });

        const response = await fetchWrapper({
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
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching AllergyIntolerance",
        );
        const allergy = bundle.entry[0].resource as AllergyIntolerance;
        assertEquals(
            allergy.id,
            allergy1.id,
            "Returned allergy should have both clinical statuses",
        );
    });

    it("OR, Array, Simple: Union of records that contain at least one match for each search criteria", async () => {
        const allergy1 = await createTestAllergyIntolerance(context, {
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
        });
        const allergy2 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    },
                ],
            },
        });
        const allergy3 = await createTestAllergyIntolerance(context, {
            clinicalStatus: {
                coding: [
                    {
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "resolved",
                    },
                ],
            },
        });
        await createTestAllergyIntolerance(context, {
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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
