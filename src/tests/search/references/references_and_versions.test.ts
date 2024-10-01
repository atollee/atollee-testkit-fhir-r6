// tests/search/references/references_and_versions.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestObservation,
    createTestQuestionnaire,
    createTestQuestionnaireResponse,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runReferencesAndVersionsTests(context: ITestContext) {
    it("Should search for resources with versioned references", async () => {
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                status: "final",
                code: "15074-8",
                system: "http://loinc.org",
                value: 60,
                unit: "bpm",
            },
        );

        const condition = await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "22298006",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code=http://snomed.info/sct|22298006`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 Condition with the specified code",
        );

        const foundCondition = bundle.entry[0].resource as Condition;
        assertEquals(
            foundCondition.id,
            condition.id,
            "Found Condition should match the created Condition",
        );
    });

    it("Should search for resources with canonical references", async () => {
        const questionnaire = await createTestQuestionnaire(context, {
            url: "http://example.org/fhir/questionnaire/patient-intake",
            version: "1.0",
        });

        await createTestQuestionnaireResponse(context, {
            questionnaire: questionnaire.url
                ? `${questionnaire.url}|${questionnaire.version}`
                : "",
            status: "completed",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `QuestionnaireResponse?questionnaire=${
                questionnaire.url ? encodeURIComponent(questionnaire.url) : ""
            }${questionnaire.version ? `|${questionnaire.version}` : ""}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with canonical reference successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 QuestionnaireResponse with the specified questionnaire",
        );
    });

    it("Should search for resources with canonical references using :below modifier", async () => {
        const questionnaireV1 = await createTestQuestionnaire(context, {
            url: "http://example.org/fhir/questionnaire/patient-intake",
            version: "1.0",
        });

        const questionnaireV11 = await createTestQuestionnaire(context, {
            url: "http://example.org/fhir/questionnaire/patient-intake",
            version: "1.1",
        });

        const questionnaireV2 = await createTestQuestionnaire(context, {
            url: "http://example.org/fhir/questionnaire/patient-intake",
            version: "2.0",
        });

        await createTestQuestionnaireResponse(context, {
            questionnaire: questionnaireV1.url
                ? `${questionnaireV1.url}|${questionnaireV1.version}`
                : "",
            status: "completed",
        });

        await createTestQuestionnaireResponse(context, {
            questionnaire: questionnaireV11.url
                ? `${questionnaireV11.url}|${questionnaireV11.version}`
                : "",
            status: "completed",
        });

        await createTestQuestionnaireResponse(context, {
            questionnaire: questionnaireV2.url
                ? `${questionnaireV2.url}|${questionnaireV2.version}`
                : "",
            status: "completed",
        });

        const responseAll = await fetchWrapper({
            authorized: true,
            relativeUrl: `QuestionnaireResponse?questionnaire:below=${
                questionnaireV1.url
                    ? encodeURIComponent(questionnaireV1.url)
                    : ""
            }`,
        });

        assertEquals(
            responseAll.status,
            200,
            "Server should process :below search successfully",
        );
        const bundleAll = responseAll.jsonBody as Bundle;
        assertEquals(
            bundleAll.entry?.length,
            3,
            "Should find 3 QuestionnaireResponses for all versions",
        );

        const responseV1 = await fetchWrapper({
            authorized: true,
            relativeUrl: `QuestionnaireResponse?questionnaire:below=${
                questionnaireV1.url
                    ? encodeURIComponent(questionnaireV1.url)
                    : ""
            }|1`,
        });

        assertEquals(
            responseV1.status,
            200,
            "Server should process :below search with major version successfully",
        );
        const bundleV1 = responseV1.jsonBody as Bundle;
        assertEquals(
            bundleV1.entry?.length,
            2,
            "Should find 2 QuestionnaireResponses for version 1.x",
        );
    });
}
