// tests/search/responses/bundle_entries.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Observation,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runBundleEntriesTests(context: ITestContext) {
    it("Search results should contain entries with 'match' mode", async () => {
        const patient = await createTestPatient(context, {
            family: "MatchTest",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=MatchTest`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry && bundle.entry.length > 0,
            "Bundle should contain entries",
        );

        const matchEntry = bundle.entry.find((entry) =>
            entry.search?.mode === "match"
        );
        assertExists(
            matchEntry,
            "Bundle should contain at least one 'match' entry",
        );
        assertEquals(
            matchEntry.resource?.id,
            patient.id,
            "Match entry should correspond to the created patient",
        );
    });

    it("Search results should contain entries with 'include' mode when _include is used", async () => {
        const patient = await createTestPatient(context, {
            family: "IncludeTest",
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "include-test",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=include-test&_include=Observation:subject`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry && bundle.entry.length > 1,
            "Bundle should contain multiple entries",
        );

        const matchEntry = bundle.entry.find((entry) =>
            entry.search?.mode === "match"
        );
        const includeEntry = bundle.entry.find((entry) =>
            entry.search?.mode === "include"
        );

        assertExists(matchEntry, "Bundle should contain a 'match' entry");
        assertExists(includeEntry, "Bundle should contain an 'include' entry");
        assertEquals(
            matchEntry.resource?.resourceType,
            "Observation",
            "Match entry should be an Observation",
        );
        assertEquals(
            includeEntry.resource?.resourceType,
            "Patient",
            "Include entry should be a Patient",
        );
    });

    it("Search results should prioritize 'match' over 'include' for the same resource", async () => {
        const patient = await createTestPatient(context, {
            family: "MatchIncludePriority",
        });
        await createTestObservation(context, patient.id!, {
            code: "match-include-priority",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=MatchIncludePriority&_include=Observation:subject`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry && bundle.entry.length > 0,
            "Bundle should contain entries",
        );

        const patientEntry = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Patient"
        );
        assertExists(patientEntry, "Bundle should contain a Patient entry");
        assertEquals(
            patientEntry.search?.mode,
            "match",
            "Patient entry should be marked as 'match'",
        );
    });

    it("Search results may contain 'outcome' entries for unacceptable searches", async () => {
        // This test attempts to trigger an unacceptable search condition
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?invalid_parameter=value`,
        });

        // The server might still return a success status even with an unacceptable search
        assertTrue(
            response.success || response.status === 400,
            "Search request should be processed",
        );

        const bundle = response.jsonBody as Bundle;

        if (bundle.entry) {
            const outcomeEntry = bundle.entry.find((entry) =>
                entry.search?.mode === "outcome"
            );
            if (outcomeEntry) {
                assertEquals(
                    outcomeEntry.resource?.resourceType,
                    "OperationOutcome",
                    "Outcome entry should be an OperationOutcome",
                );
                const operationOutcome = outcomeEntry
                    .resource as OperationOutcome;
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.severity === "error" ||
                        issue.severity === "warning"
                    ),
                    "OperationOutcome should contain an error or warning issue",
                );
            } else {
                assertTrue(
                    true,
                    "Server did not return an 'outcome' entry for this unacceptable search",
                );
            }
        } else {
            assertTrue(
                true,
                "Server did not return any entries for this unacceptable search",
            );
        }
    });

    it("Search results should not contain duplicate entries", async () => {
        const patient = await createTestPatient(context, {
            family: "DuplicateTest",
        });
        await createTestObservation(context, patient.id!, {
            code: "duplicate-test",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=DuplicateTest&_include=Observation:subject`,
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry && bundle.entry.length > 0,
            "Bundle should contain entries",
        );

        const uniqueIds = new Set(
            bundle.entry.map((entry) => entry.resource?.id),
        );
        assertEquals(
            uniqueIds.size,
            bundle.entry.length,
            "All entries should have unique IDs",
        );
    });
}
