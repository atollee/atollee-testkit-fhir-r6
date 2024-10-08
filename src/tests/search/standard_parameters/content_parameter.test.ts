// tests/search/parameters/content_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestObservation } from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runContentParameterTests(context: ITestContext) {
    if (context.isFullTextSearchSupported()) {
        it("Should find Observation with _content in code", async () => {
            const uniqueContent = uniqueString("TestCancer");
            await createTestObservation(context, context.getValidPatientId(), {
                code: uniqueContent,
                system: "http://example.com/test-system",
                display: `Observation of ${uniqueContent}`,
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_content=${uniqueContent}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertEquals(
                (bundle.entry[0].resource as Observation).code.coding?.[0].code,
                uniqueContent,
                "Found Observation should contain the unique content in code",
            );
        });

        it("Should find Observation with _content in display", async () => {
            const uniqueContent = uniqueString("TestMetastases");
            await createTestObservation(context, context.getValidPatientId(), {
                code: "test-code",
                system: "http://example.com/test-system",
                display: `Observation of ${uniqueContent}`,
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_content=${uniqueContent}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertEquals(
                (bundle.entry[0].resource as Observation).code.coding?.[0]
                    .display
                    ?.includes(uniqueContent),
                true,
                "Found Observation should contain the unique content in display",
            );
        });

        it("Should find Observation with _content in valueCodeableConcept", async () => {
            const uniqueContent = uniqueString("TestTumor");
            await createTestObservation(context, context.getValidPatientId(), {
                valueCodeableConcept: {
                    coding: [{
                        system: "http://example.com/test-system",
                        code: "test-code",
                        display: `Value of ${uniqueContent}`,
                    }],
                },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_content=${uniqueContent}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertEquals(
                (bundle.entry[0].resource as Observation).valueCodeableConcept
                    ?.coding?.[0].display?.includes(uniqueContent),
                true,
                "Found Observation should contain the unique content in valueCodeableConcept",
            );
        });

        it("Should support OR logic in _content parameter", async () => {
            const uniqueContent1 = uniqueString("TestCancer");
            const uniqueContent2 = uniqueString("TestMetastases");
            const uniqueContent3 = uniqueString("TestTumor");

            await createTestObservation(context, context.getValidPatientId(), {
                code: uniqueContent1,
                system: "http://example.com/test-system",
            });

            await createTestObservation(context, context.getValidPatientId(), {
                code: "test-code",
                system: "http://example.com/test-system",
                display: `Observation of ${uniqueContent2}`,
            });

            await createTestObservation(context, context.getValidPatientId(), {
                valueCodeableConcept: {
                    coding: [{
                        system: "http://example.com/test-system",
                        code: "test-code",
                        display: `Value of ${uniqueContent3}`,
                    }],
                },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?_content=${uniqueContent1} OR ${uniqueContent2} OR ${uniqueContent3}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter with OR logic successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                "Bundle should contain three entries",
            );
        });

        it("Should not find resources when _content doesn't match", async () => {
            const uniqueContent = uniqueString("TestNoMatch");

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_content=${uniqueContent}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(bundle.total, 0, "Bundle should contain no entries");
        });
    }
}
