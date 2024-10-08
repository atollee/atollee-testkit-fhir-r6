// tests/search/references/references_and_versions.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestObservation,
    createTestQuestionnaire,
    createTestQuestionnaireResponse,
    createTestStructureDefinition,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Condition,
    StructureDefinition,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { contentType } from "jsr:@std/media-types@0.218/content_type";

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

        const response = await fetchSearchWrapper({
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

        const response = await fetchSearchWrapper({
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

    if (context.isHapiBugsDisallowed()) {
        it("Should search for resources with canonical references using :below modifier", async () => {
            const baseUrl = uniqueString(
                "http://example.org/fhir/StructureDefinition/patient-extension",
            );

            await createTestStructureDefinition(
                context,
                {
                    url: baseUrl,
                    version: "1.0.0",
                    name: "PatientExtensionV1",
                    status: "active",
                    kind: "complex-type",
                    abstract: false,
                    type: "Extension",
                },
            );

            await createTestStructureDefinition(
                context,
                {
                    url: baseUrl,
                    version: "1.1.0",
                    name: "PatientExtensionV11",
                    status: "active",
                    kind: "complex-type",
                    abstract: false,
                    type: "Extension",
                },
            );

            await createTestStructureDefinition(
                context,
                {
                    url: baseUrl,
                    version: "2.0.0",
                    name: "PatientExtensionV2",
                    status: "active",
                    kind: "complex-type",
                    abstract: false,
                    type: "Extension",
                },
            );

            // Search for all versions
            const responseAll = await fetchWrapper({
                authorized: true,
                relativeUrl: `StructureDefinition?url:below=${
                    encodeURIComponent(baseUrl)
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
                "Should find 3 StructureDefinitions for all versions",
            );

            // Search for versions below 1.x
            const responseV1 = await fetchWrapper({
                authorized: true,
                relativeUrl: `StructureDefinition?url:below=${
                    encodeURIComponent(baseUrl)
                }%7C1`,
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
                "Should find 2 StructureDefinitions for version 1.x",
            );

            // Search for versions below 1.0.5 (should return only 1.0.0)
            const responseV105 = await fetchWrapper({
                authorized: true,
                relativeUrl: `StructureDefinition?url:below=${
                    encodeURIComponent(baseUrl)
                }%7C1.0.5`,
            });

            assertEquals(
                responseV105.status,
                200,
                "Server should process :below search with specific version successfully",
            );
            const bundleV105 = responseV105.jsonBody as Bundle;
            assertEquals(
                bundleV105.entry?.length,
                1,
                "Should find 1 StructureDefinition for version below 1.0.5",
            );

            if (bundleV105.entry && bundleV105.entry.length > 0) {
                const foundStructureDef = bundleV105.entry[0]
                    .resource as StructureDefinition;
                assertEquals(
                    foundStructureDef.version,
                    "1.0.0",
                    "Found StructureDefinition should be version 1.0.0",
                );
            }
        });
    }
}
