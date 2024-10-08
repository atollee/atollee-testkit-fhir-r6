// tests/search/parameters/language_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestQuestionnaire } from "../../utils/resource_creators.ts";
import { Bundle, Questionnaire } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runLanguageParameterTests(context: ITestContext) {
    if (context.isLanguageSearchParameterSupported()) {
        it("Should find Questionnaire resources with specific language", async () => {
            const questionnaire = await createTestQuestionnaire(context, {
                title: uniqueString("SpanishQuestionnaire"),
                language: "es",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=es`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _language parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Questionnaire).id === questionnaire.id
                ),
                "Bundle should contain the created Spanish Questionnaire",
            );
        });

        it("Should not find Questionnaire resources with different language", async () => {
            await createTestQuestionnaire(context, {
                title: uniqueString("EnglishQuestionnaire"),
                language: "en",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=es`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _language parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.total,
                0,
                "Bundle should contain no entries for non-matching language",
            );
        });

        it("Should handle multiple language search", async () => {
            const spanishQuestionnaire = await createTestQuestionnaire(
                context,
                {
                    title: uniqueString("SpanishQuestionnaire"),
                    language: "es",
                },
            );

            const frenchQuestionnaire = await createTestQuestionnaire(context, {
                title: uniqueString("FrenchQuestionnaire"),
                language: "fr",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=es,fr`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process multiple _language parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Bundle should contain two entries",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Questionnaire).id ===
                        spanishQuestionnaire.id
                ),
                "Bundle should contain the Spanish Questionnaire",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Questionnaire).id ===
                        frenchQuestionnaire.id
                ),
                "Bundle should contain the French Questionnaire",
            );
        });

        it("Should handle case-insensitive language search", async () => {
            const questionnaire = await createTestQuestionnaire(context, {
                title: uniqueString("SpanishQuestionnaire"),
                language: "es",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=ES`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process case-insensitive _language parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Questionnaire).id === questionnaire.id
                ),
                "Bundle should contain the created Spanish Questionnaire",
            );
        });

        it("Should handle invalid language code", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=invalid`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process invalid _language parameter",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.total,
                0,
                "Bundle should contain no entries for invalid language code",
            );
        });

        it("Should work with other search parameters", async () => {
            const questionnaire = await createTestQuestionnaire(context, {
                title: uniqueString("SpanishQuestionnaire"),
                language: "es",
                status: "active",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Questionnaire?_language=es&status=active`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _language parameter with other parameters successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Questionnaire).id === questionnaire.id
                ),
                "Bundle should contain the created active Spanish Questionnaire",
            );
        });
    }
}
