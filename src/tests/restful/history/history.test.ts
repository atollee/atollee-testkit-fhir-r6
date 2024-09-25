// tests/history.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";

export function runHistoryTests(_context: ITestContext) {
    it("History - Single resource", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "Test", given: ["History"] }],
            }),
        });

        assertEquals(
            createResponse.status,
            201,
            "Patient creation should be successful",
        );

        const patient = createResponse.jsonBody as Patient;
        const patientId = patient.id;

        assertEquals(patient.id, patientId, "Patient id should match");

        // Then, update the patient
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            body: JSON.stringify({
                resourceType: "Patient",
                id: patientId,
                name: [{ family: "Test", given: ["History", "Updated"] }],
            }),
        });

        assertEquals(
            updateResponse.status,
            200,
            "Patient update should be successful",
        );

        // Now, get the history
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}/_history`,
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        assertEquals(
            historyBundle.entry?.length,
            2,
            "History should have 2 entries",
        );

        // Check that entries are sorted with oldest versions last
        const createEntry = historyBundle.entry?.[1];
        const updateEntry = historyBundle.entry?.[0];

        assertEquals(
            createEntry?.request?.method,
            "POST",
            "First entry should be a create",
        );
        assertEquals(
            updateEntry?.request?.method,
            "PUT",
            "Second entry should be an update",
        );
    });

    it("History - All resources of a type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_history",
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        historyBundle.entry?.forEach((entry) => {
            assertEquals(
                entry.resource?.resourceType,
                "Patient",
                "All entries should be Patients",
            );
        });
    });

    it("History - All resources", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "_history",
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
    });

    it("History - With _since parameter", async () => {
        const sinceDate = new Date(Date.now() - 3600000).toISOString(); // 1 hour ago
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `_history?_since=${sinceDate}`,
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        historyBundle.entry?.forEach((entry) => {
            const entryDate = entry.response?.lastModified ||
                // deno-lint-ignore no-explicit-any
                (entry.resource as any).meta?.lastUpdated;
            assertExists(entryDate, "Each entry should have a date");
            assertEquals(
                new Date(entryDate) >= new Date(sinceDate),
                true,
                "All entries should be after the _since date",
            );
        });
    });

    it("History - With _count parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "_history?_count=5",
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        assertTrue(
            historyBundle.entry?.length ?? 0 <= 5,
            "Should return no more than 5 entries",
        );
    });

    it("History - With _at parameter", async () => {
        const atDate = new Date(Date.now() - 86400000).toISOString(); // 24 hours ago
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `_history?_at=${atDate}`,
        });
        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        // Note: Checking the exact _at behavior would require more complex logic and knowledge of the server's data
    });

    it("History - Unsupported resource type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedResource/_history",
        });

        assertEquals(
            response.status,
            404,
            "History request for unsupported resource type should return 404 Not Found",
        );
    });

    it("History - With _sort parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "_history?_sort=_lastUpdated",
        });

        assertEquals(
            response.status,
            200,
            "History request should be successful",
        );
        const historyBundle = response.jsonBody as Bundle;
        assertEquals(
            historyBundle.type,
            "history",
            "Response should be a history bundle",
        );
        // Check that entries are sorted in ascending order
        let lastDate: Date | null = null;
        historyBundle.entry?.forEach((entry) => {
            const entryDate = new Date(
                entry.response?.lastModified ||
                    // deno-lint-ignore no-explicit-any
                    (entry.resource as any).meta?.lastUpdated,
            );
            if (lastDate) {
                assertEquals(
                    entryDate >= lastDate,
                    true,
                    "Entries should be in ascending order",
                );
            }
            lastDate = entryDate;
        });
    });
}
