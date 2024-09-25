// tests/utils/resource_creators.ts

import { AllergyIntolerance } from "npm:@types/fhir/r4.d.ts";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";

// ... other imports and functions ...

export async function createTestAllergyIntolerance(
    context: ITestContext,
    options: {
      clinicalStatus?: {
        coding: Array<{
          system: string;
          code: string;
        }>;
      };
    } = {}
  ): Promise<AllergyIntolerance> {
    const newAllergyIntolerance: AllergyIntolerance = {
      resourceType: "AllergyIntolerance",
      patient: {
        reference: `Patient/${context.getValidPatientId()}`,
      },
      code: {
        coding: [{
          system: "http://snomed.info/sct",
          code: "418689008",
          display: "Allergy to grass pollen",
        }],
      },
      ...options,
    };
  
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: "AllergyIntolerance",
      method: "POST",
      body: JSON.stringify(newAllergyIntolerance),
    });
  
    return response.jsonBody as AllergyIntolerance;
  }