import {
    CodeableConcept,
    Reference,
    RiskAssessment,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";

// Add this interface
interface RiskAssessmentOptions extends IIdentifierOptions {
    subject: Reference;
    prediction?: Array<{
        probabilityDecimal?: number;
        outcome?: CodeableConcept;
    }>;
    status?: RiskAssessment["status"];
}

// Add this function
export async function createTestRiskAssessment(
    _context: ITestContext,
    options: RiskAssessmentOptions,
): Promise<RiskAssessment> {
    const defaultOptions: RiskAssessmentOptions = {
        subject: options.subject,
        status: "final",
        prediction: [{
            probabilityDecimal: 0.5,
            outcome: {
                text: "Default outcome",
            },
        }],
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        identifier: createIdentifierOptions(options.identifier),
    };

    const newRiskAssessment: RiskAssessment = {
        resourceType: "RiskAssessment",
        subject: mergedOptions.subject,
        status: mergedOptions.status || "unknown",
        prediction: mergedOptions.prediction,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "RiskAssessment",
        method: "POST",
        body: JSON.stringify(newRiskAssessment),
    });

    return response.jsonBody as RiskAssessment;
}
