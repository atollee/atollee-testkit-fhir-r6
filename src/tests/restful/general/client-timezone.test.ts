// tests/client-timezone.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { Bundle, BundleEntry } from "npm:@types/fhir/r4.d.ts";

export function runClientTimezoneTests(context: ITestContext) {
    const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
    it("Client Timezone - Header is sent and acknowledged", async () => {
        const clientTimezone = context.getValidTimezone();
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        assertEquals(response.success, true, "Request should be successful");
    });
    it("Client Timezone - Affects server-side logic", async () => {
        const clientTimezone = "America/New_York";
        const expectedOffset = "-04:00"; // EDT offset for America/New_York

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}/_history`,
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertExists(response.jsonBody, "Response should include JSON body");
        assertEquals(
            response.jsonBody.resourceType,
            "Bundle",
            "Response should be a Bundle",
        );

        const bundle = response.jsonBody as Bundle;

        // Check if any date/time in the response is consistent with the specified client timezone
        const hasClientTimezone = bundle.entry?.some((entry: BundleEntry) => {
            const resource = entry.resource;
            if (resource?.meta && resource?.meta.lastUpdated) {
                return resource.meta.lastUpdated.includes(expectedOffset);
            }
            return false;
        });

        assertEquals(
            hasClientTimezone,
            true,
            `At least one resource should have a date/time with the offset ${expectedOffset} for ${clientTimezone} timezone`,
        );
    });
    it("Client Timezone - Different timezones produce different results", async () => {
        const otherTimezone = "America/New_York";
        const clientTimezone = context.getValidTimezone();

        const berlinResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation?date=2023-07-01",
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        const nyResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation?date=2023-07-01",
            headers: {
                "client-timezone": otherTimezone,
            },
        });

        assertEquals(
            berlinResponse.success,
            true,
            "Berlin timezone request should be successful",
        );
        assertEquals(
            nyResponse.success,
            true,
            "New York timezone request should be successful",
        );

        // The results might be different due to timezone differences
        assertNotEquals(
            JSON.stringify(berlinResponse.jsonBody),
            JSON.stringify(nyResponse.jsonBody),
            "Responses for different timezones should potentially be different",
        );
    });

    it("Client Timezone - Server respects original timezone for historical data", async () => {
        const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
        const clientTimezone = context.getValidTimezone();

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}/$everything`,
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        assertEquals(response.success, true, "Request should be successful");
        assertExists(response.jsonBody, "Response should include JSON body");
        assertEquals(
            response.jsonBody.resourceType,
            "Bundle",
            "Response should be a Bundle",
        );

        const bundle = response.jsonBody as Bundle;

        // Check if historical data maintains its original timezone
        const hasOriginalTimezone = bundle.entry?.some((entry: BundleEntry) => {
            const resource = entry.resource;
            if (
                resource?.resourceType === "Encounter" && resource.period &&
                resource.period.start
            ) {
                return !resource.period.start.includes("+02:00") &&
                    !resource.period.start.includes("+01:00");
            }
            return false;
        });

        assertEquals(
            hasOriginalTimezone,
            true,
            "Historical data should maintain its original timezone",
        );
    });
}
