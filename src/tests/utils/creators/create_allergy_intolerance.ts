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
}

export async function createTestAllergyIntolerance(
    context: ITestContext,
    patientId: string,
    options: AllergyIntoleranceOptions = {},
): Promise<AllergyIntolerance> {
    const newAllergyIntolerance: AllergyIntolerance = {
        resourceType: "AllergyIntolerance",
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
        ...options,
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "AllergyIntolerance",
        method: "POST",
        body: JSON.stringify(newAllergyIntolerance),
    });

    if (!response.success) {
        console.log(JSON.stringify(response, null, 2));
    }
    assertTrue(response.success, "creation of allergy intolerance was successful");
    return response.jsonBody as AllergyIntolerance;
}
