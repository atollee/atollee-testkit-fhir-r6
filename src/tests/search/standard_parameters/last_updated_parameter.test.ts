// tests/search/parameters/last_updated_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestObservation } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runLastUpdatedParameterTests(context: ITestContext) {
    it("Should find resources updated after a specific date", async () => {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - 1); // Yesterday

        // Create an observation
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_lastUpdated=gt${testDate.toISOString()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should not find resources updated before a specific date", async () => {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() + 1); // Tomorrow

        // Create an observation
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_lastUpdated=gt${testDate.toISOString()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    it("Should find resources updated within a date range", async () => {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 2); // Two days ago
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 1); // Tomorrow

        // Create an observation
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_lastUpdated=ge${startDate.toISOString()}&_lastUpdated=le${endDate.toISOString()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated range successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should handle invalid date format", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_lastUpdated=invalid-date`,
        });

        assertEquals(
            response.status,
            400,
            "Server should return 400 for invalid date format",
        );
    });

    it("Should handle multiple resource types with _lastUpdated", async () => {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - 1); // Yesterday

        // Create an observation
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `?_type=Observation,Patient&_lastUpdated=gt${testDate.toISOString()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated with multiple resource types successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });
}
