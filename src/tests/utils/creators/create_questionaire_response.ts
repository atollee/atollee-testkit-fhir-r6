// Add this to your resource_creators.ts file or create new files for each

import { QuestionnaireResponse } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface QuestionnaireResponseOptions {
    questionnaire: string;
    status:
        | "in-progress"
        | "completed"
        | "amended"
        | "entered-in-error"
        | "stopped";
    subject?: { reference: string };
}

export async function createTestQuestionnaireResponse(
    context: ITestContext,
    options: QuestionnaireResponseOptions,
): Promise<QuestionnaireResponse> {
    const newQuestionnaireResponse: QuestionnaireResponse = {
        resourceType: "QuestionnaireResponse",
        questionnaire: options.questionnaire,
        status: options.status,
        subject: options.subject ||
            { reference: `Patient/${context.getValidPatientId()}` },
        item: [
            {
                linkId: "1",
                text: "Sample Question",
                answer: [
                    {
                        valueString: "Sample Answer",
                    },
                ],
            },
        ],
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "QuestionnaireResponse",
        method: "POST",
        body: JSON.stringify(newQuestionnaireResponse),
    });

    return response.jsonBody as QuestionnaireResponse;
}
