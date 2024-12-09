// tests/utils/resource_creators.ts

import { AllergyIntolerance } from "npm:@types/fhir/r4.d.ts";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";
import { IIdentifierOptions } from "./types.ts";
import { createIdentifierOptions } from "./utils.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface AllergyIntoleranceOptions extends IIdentifierOptions {
    clinicalStatus?: {
        coding: Array<{
            system: string;
            code: string;
        }>;
    };
    category?: Array<"food" | "medication" | "environment" | "biologic">;
    noClinicalStatus?: boolean;
}

export async function createTestAllergyIntolerance(
    _context: ITestContext,
    patientId: string,
    options: AllergyIntoleranceOptions = {},
): Promise<AllergyIntolerance> {
    const newAllergyIntolerance: AllergyIntolerance = {
        resourceType: "AllergyIntolerance",
        // Add default clinicalStatus if not provided
        clinicalStatus: options.clinicalStatus,
        patient: {
            reference: `Patient/${patientId}`,
        },
        code: {
            coding: [{
                system: "http://snomed.info/sct",
                code: "418689008",
                display: "Allergy to grass pollen",
            }],
        },
        // Only add category if provided in options
        ...(options.category && { category: options.category }),
        // Spread remaining options to allow overrides
        // Ensure identifier is handled properly
        identifier: createIdentifierOptions(options.identifier),
    };

    if (options.noClinicalStatus !== true) {
        if (!newAllergyIntolerance.clinicalStatus) {
            newAllergyIntolerance.clinicalStatus = {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "active",
                }],
            };
        }
    } else {
        newAllergyIntolerance.verificationStatus = {
            coding: [{
                system:
                    "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                code: "entered-in-error",
            }],
        };
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "AllergyIntolerance",
        method: "POST",
        body: JSON.stringify(newAllergyIntolerance),
    });

    if (!response.success) {
        console.log(JSON.stringify(response, null, 2));
    }
    assertTrue(
        response.success,
        "creation of allergy intolerance was successful",
    );
    return response.jsonBody as AllergyIntolerance;
}
