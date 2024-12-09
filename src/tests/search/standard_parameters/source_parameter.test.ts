// tests/search/parameters/source_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
    uniqueNumber,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runSourceParameterTests(context: ITestContext) {
    if (context.isSourceSearchParameterSupported()) {
        it("Should find resources with a specific source", async () => {
            const sourceUri = uniqueString(
                "http://example.com/Organization/123",
            );

            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { source: sourceUri },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${encodeURIComponent(sourceUri)}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _source parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertEquals(
                (bundle.entry[0].resource as Patient).meta?.source,
                sourceUri,
                "Returned Patient should have the correct source",
            );
        });

        it("Should not find resources without the specified source", async () => {
            const sourceUri = uniqueString(
                "http://example.com/Organization/123",
            );
            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { source: "http://example.com/Organization/456" },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${encodeURIComponent(sourceUri)}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _source parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(bundle.total, 0, "Bundle should contain no entries");
        });

        it("Should work with _source across different resource types", async () => {
            const sourceUri = uniqueString(
                "http://example.com/Organization/123",
            );

            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { source: sourceUri },
            });
            await createTestObservation(context, context.getValidPatientId(), {
                code: uniqueString("TestCode"),
                meta: { source: sourceUri },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `?_source=${encodeURIComponent(sourceUri)}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _source parameter across resource types successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length >= 2,
                "Bundle should contain at least two entries",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    entry.resource?.resourceType === "Patient"
                ) &&
                    bundle.entry.some((entry) =>
                        entry.resource?.resourceType === "Observation"
                    ),
                "Bundle should contain both Patient and Observation resources",
            );
        });

        it("Should handle invalid source URI", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=invalid-uri`,
            });

            assertEquals(
                response.status,
                400,
                "Server should return 400 for invalid source URI",
            );
        });

        it("Should combine _source with other search parameters", async () => {
            const sourceUri = uniqueString(
                "http://example.com/Organization/123",
            );
            const uniqueName = uniqueString("TestName");
            await createTestPatient(context, {
                name: [{ given: [uniqueName] }],
                meta: { source: sourceUri },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${
                    encodeURIComponent(sourceUri)
                }&name=${uniqueName}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _source with other parameters successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Bundle should contain one entry",
            );
            assertEquals(
                (bundle.entry[0].resource as Patient).name?.[0].given?.[0],
                uniqueName,
                "Returned Patient should have the correct name",
            );
        });

        it("Should handle partial matches on source URI", async () => {
            const uniqueNumberValue = uniqueNumber();
            const sourceUri = uniqueString(
                `http://example-${uniqueNumberValue}.com/Organization/123`,
            );
            const partialSourceUri = `http://example-${uniqueNumberValue}.com`;
            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { source: sourceUri },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${
                    encodeURIComponent(partialSourceUri)
                }`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process partial _source parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });

        it("Should handle multiple _source parameters", async () => {
            const sourceUri = uniqueString(
                "http://example.com/Organization/123",
            );
            const sourceUri2 = uniqueString(
                "http://example.com/Organization/456",
            );
            await createTestPatient(context, {
                name: [{ given: ["TestPatient1"] }],
                meta: { source: sourceUri },
            });
            await createTestPatient(context, {
                name: [{ given: ["TestPatient2"] }],
                meta: { source: sourceUri2 },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${
                    encodeURIComponent(sourceUri)
                }&_source=${encodeURIComponent(sourceUri2)}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process multiple _source parameters successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Bundle should contain two entries",
            );
        });
    }
}
