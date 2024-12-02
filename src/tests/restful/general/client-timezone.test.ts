// tests/client-timezone.test.ts

import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    BundleEntry,
    Encounter,
    Observation,
} from "npm:@types/fhir/r4.d.ts";
import {
    createTestEncounter,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { DateTime } from "luxon";

export function runClientTimezoneTests(context: ITestContext) {
    it("Client Timezone - Header is sent and acknowledged", async () => {
        const patient = await createTestPatient(context);
        const validPatientId = patient.id;
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

    it("Client Timezone - Server respects timezone differences in date searches", async () => {
        const serverTimezone = context.getServerTimezone();

        // Force client timezone to be UTC+14 (Line Islands)
        const clientTimezone = "Pacific/Kiritimati"; // UTC+14

        // Create a test patient
        const patient = await createTestPatient(context);

        // Create date at 23:00 UTC on Jan 1, 2000 in server timezone
        const serverDateTime = DateTime.fromObject(
            {
                year: 2000,
                month: 1,
                day: 1,
                hour: 23,
                minute: 0,
            },
            { zone: serverTimezone },
        );

        // Create observation using server time - ensure proper ISO format
        const observation = await createTestObservation(context, patient.id!, {
            status: "final",
            effectiveDateTime: serverDateTime.toUTC().toISO(), // Convert to UTC ISO format
        });

        // Convert to client timezone (UTC+14)
        const clientDateTime = serverDateTime.setZone(clientTimezone);

        // Verify test precondition - dates should differ
        assertTrue(
            serverDateTime.day !== clientDateTime.day ||
                serverDateTime.month !== clientDateTime.month,
            `Test requires dates that differ between timezones: ` +
                `Server: ${serverDateTime.toUTC().toISO()}, ` +
                `Client: ${clientDateTime.toUTC().toISO()}`,
        );

        // Search using server's day - should find observation
        const serverDaySearch = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=${
                serverDateTime.toFormat("yyyy-MM-dd")
            }`, // Date only format
            headers: {
                "client-timezone": serverTimezone,
            },
        });

        assertEquals(
            serverDaySearch.success,
            true,
            "Server timezone search should succeed",
        );

        const serverBundle = serverDaySearch.jsonBody as Bundle;
        assertTrue(
            serverBundle.entry?.some((e) => e.resource?.id === observation.id),
            "Should find observation when searching with server timezone",
        );

        // Search using client's day - should NOT find observation
        const clientDaySearch = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=${
                clientDateTime.toFormat("yyyy-MM-dd")
            }`, // Date only format
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        assertEquals(
            clientDaySearch.success,
            true,
            "Client timezone search should succeed",
        );

        const clientBundle = clientDaySearch.jsonBody as Bundle;
        assertEquals(
            clientBundle.total,
            0,
            `Should not find observation when searching with client timezone ${clientTimezone} ` +
                `(${clientDateTime.toUTC().toISO()}) ` +
                `for server date ${serverDateTime.toUTC().toISO()}`,
        );

        // Verify precise datetime search still works regardless of timezone
        const preciseDateSearch = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=${serverDateTime.toUTC().toISO()}`, // Full UTC ISO format
            headers: {
                "client-timezone": clientTimezone,
            },
        });

        assertEquals(
            preciseDateSearch.success,
            true,
            "Precise datetime search should succeed",
        );

        const preciseBundle = preciseDateSearch.jsonBody as Bundle;
        assertTrue(
            preciseBundle.entry?.some((e) => e.resource?.id === observation.id),
            "Should find observation when searching with precise datetime regardless of timezone",
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

    it("Client Timezone - Server preserves original timezone in stored data", async () => {
        const patient = await createTestPatient(context);

        // Create an observation with explicit timezone/offset
        const observationTimeWithOffset = "2000-01-01T10:00:00.000+01:00";

        // Create observation
        const observation = await createTestObservation(context, patient.id!, {
            status: "final",
            effectiveDateTime: observationTimeWithOffset,
        });

        // Retrieve the observation directly
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation/${observation.id}`,
        });

        assertEquals(
            response.success,
            true,
            "Request should be successful",
        );

        const returnedObservation = response.jsonBody as Observation;
        assertExists(
            returnedObservation.effectiveDateTime,
            "Observation should have effectiveDateTime",
        );

        // Server must preserve the original timezone/offset
        assertEquals(
            returnedObservation.effectiveDateTime,
            observationTimeWithOffset,
            "Server should preserve original timezone offset in stored timestamps",
        );

        // Also verify through search
        const searchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_id=${observation.id}`,
        });

        assertEquals(
            searchResponse.success,
            true,
            "Search should be successful",
        );

        const bundle = searchResponse.jsonBody as Bundle;
        const searchedObservation = bundle.entry?.[0]?.resource as Observation;

        assertEquals(
            searchedObservation?.effectiveDateTime,
            observationTimeWithOffset,
            "Server should preserve original timezone offset when returning search results",
        );
    });
}
