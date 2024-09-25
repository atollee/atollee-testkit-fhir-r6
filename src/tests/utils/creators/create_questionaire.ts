// Add this to your resource_creators.ts file or create new files for each

import { Questionnaire } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface QuestionnaireOptions {
    url?: string;
    version?: string;
    status?: "draft" | "active" | "retired" | "unknown";
    title?: string;
    language?: string;
}

export async function createTestQuestionnaire(
    _context: ITestContext,
    options: QuestionnaireOptions,
): Promise<Questionnaire> {
    const newQuestionnaire: Questionnaire = {
        resourceType: "Questionnaire",
        url: options.url,
        version: options.version,
        status: options.status || "active",
        title: options.title || `Test Questionnaire ${Date.now()}`,
        language: options.language,
        item: [
            {
                linkId: "1",
                text: "Sample Question",
                type: "string",
            },
        ],
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Questionnaire",
        method: "POST",
        body: JSON.stringify(newQuestionnaire),
    });

    return response.jsonBody as Questionnaire;
}
