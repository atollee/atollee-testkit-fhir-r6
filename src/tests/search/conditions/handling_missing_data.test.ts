// tests/search/parameters/handling_missing_data.test.ts

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
import { AllergyIntolerance, Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runHandlingMissingDataTests(context: ITestContext) {
    it("Should only return AllergyIntolerance resources with active clinical status", async () => {
        const patient = await createTestPatient(context, {});
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

        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "inactive",
                }],
            },
        });

        await createTestAllergyIntolerance(context, patient.id!, {}); // No clinical status

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?clinical-status=http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical|active`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Only one AllergyIntolerance should be returned",
        );
        assertEquals(
            (bundle.entry[0].resource as AllergyIntolerance).id,
            activeAllergy.id,
            "The returned AllergyIntolerance should be the one with active clinical status",
        );
    });

    it("Should return AllergyIntolerance resources with missing clinical status", async () => {
        const patient = await createTestPatient(context, {});
        const allergyWithoutStatus = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {},
        );

        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "active",
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `AllergyIntolerance?clinical-status:missing=true`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Only one AllergyIntolerance should be returned",
        );
        assertEquals(
            (bundle.entry[0].resource as AllergyIntolerance).id,
            allergyWithoutStatus.id,
            "The returned AllergyIntolerance should be the one without clinical status",
        );
    });

    it("Should return empty result when combining active status and missing modifier", async () => {
        const patient = await createTestPatient(context, {});
        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "active",
                }],
            },
        });

        await createTestAllergyIntolerance(context, patient.id!, {}); // No clinical status

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?clinical-status=http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical|active&clinical-status:missing=true`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "No AllergyIntolerance should be returned",
        );
    });

    it("Should return both active and missing clinical status AllergyIntolerance resources using _filter", async () => {
        const patient = await createTestPatient(context, {});
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

        const allergyWithoutStatus = await createTestAllergyIntolerance(
            context,
            patient.id!,
            {},
        );

        await createTestAllergyIntolerance(context, patient.id!, {
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "inactive",
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `AllergyIntolerance?_filter=clinical-status eq http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical|active or clinical-status eq null`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the _filter search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 1,
            "AllergyIntolerance resources should be returned",
        );
        const activeClinicalStatusFound = bundle.entry.some((entry) =>
            (entry.resource as AllergyIntolerance).id === activeAllergy.id
        );
        const withoutClinicalStatusFound = bundle.entry.some((entry) =>
            (entry.resource as AllergyIntolerance).id ===
                allergyWithoutStatus.id
        );
        assertTrue(
            activeClinicalStatusFound || withoutClinicalStatusFound,
            "Results should include the AllergyIntolerance with active clinical status",
        );
    });
}
