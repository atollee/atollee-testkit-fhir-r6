import {
    CodeableConcept,
    ImmunizationRecommendation,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

interface ImmunizationRecommendationOptions {
    patient: Reference;
    recommendation: Array<{
        doseNumber?: number | string;
        forecastStatus: CodeableConcept;
    }>;
    date?: string;
}

// Add this function
export async function createTestImmunizationRecommendation(
    _context: ITestContext,
    options: ImmunizationRecommendationOptions,
): Promise<ImmunizationRecommendation> {
    const defaultOptions: ImmunizationRecommendationOptions = {
        patient: options.patient,
        recommendation: [{
            doseNumber: 1,
            forecastStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/immunization-recommendation-status",
                    code: "due",
                }],
            },
        }],
        date: new Date().toISOString(),
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const newImmunizationRecommendation: ImmunizationRecommendation = {
        resourceType: "ImmunizationRecommendation",
        patient: mergedOptions.patient,
        recommendation: mergedOptions.recommendation,
        date: mergedOptions.date || new Date().toISOString(),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "ImmunizationRecommendation",
        method: "POST",
        body: JSON.stringify(newImmunizationRecommendation),
    });

    return response.jsonBody as ImmunizationRecommendation;
}
