import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchBaseTests(context: ITestContext) {
    it("Should search encounters with sorting, count, total, class filter and patient include", async () => {
        // Create test patients
        const patient1 = await createTestPatient(context, {
            name: [{ family: uniqueString("TestPatient1") }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ family: uniqueString("TestPatient2") }],
        });

        // Create multiple encounters with different timestamps
        const encounters = [];
        for (let i = 0; i < 20; i++) {
            const encounter = await createTestEncounter(context, {
                subject: {
                    reference: `Patient/${
                        i % 2 === 0 ? patient1.id : patient2.id
                    }`,
                },
                class: {
                    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                    code: "AMB",
                    display: "ambulatory",
                },
                status: "finished",
                period: {
                    start: new Date(Date.now() - (i * 1000 * 60 * 60))
                        .toISOString(), // Different timestamps
                    end: new Date(Date.now() - (i * 1000 * 60 * 30))
                        .toISOString(),
                },
            });
            encounters.push(encounter);
            // Add small delay to ensure different lastUpdated timestamps
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Perform the complex search
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                "Encounter?_sort=_lastUpdated&_count=5&_total=accurate&class=AMB&_include=Encounter:subject",
        });

        assertEquals(response.status, 200, "Search should be successful");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Verify total count
        assertExists(bundle.total, "Bundle should have a total count");
        assertTrue(
            bundle.total >= 20,
            "Total should reflect all matching encounters",
        );

        // Verify count limit
        assertEquals(
            bundle.entry.length,
            5 + 2,
            "Should return 5 encounters plus 2 included patients",
        );

        // Verify entries are encounters and included patients
        const encounterEntries = bundle.entry.filter((e) =>
            e.resource?.resourceType === "Encounter"
        );
        const patientEntries = bundle.entry.filter((e) =>
            e.resource?.resourceType === "Patient"
        );

        assertEquals(
            encounterEntries.length,
            5,
            "Should have 15 encounter entries",
        );
        assertEquals(patientEntries.length, 2, "Should have 2 patient entries");

        // Verify sorting by _lastUpdated
        const timestamps = encounterEntries
            .map((e) => (e.resource as Encounter).meta?.lastUpdated)
            .filter((t): t is string => t !== undefined);

        assertTrue(
            timestamps.length > 0,
            "Should have timestamps to verify sorting",
        );

        assertTrue(
            timestamps.length > 0,
            "Should have timestamps to verify sorting",
        );
        const isSortedAscending = timestamps.every((t, i) =>
            i === 0 || t >= timestamps[i - 1]
        );
        assertTrue(
            isSortedAscending,
            "Encounters should be sorted by _lastUpdated in ascending order by default",
        );

        // Verify class code filter
        assertTrue(
            encounterEntries.every((e) =>
                (e.resource as Encounter).class?.code === "AMB"
            ),
            "All encounters should have ambulatory class code",
        );

        // Verify patient inclusion
        const includedPatientIds = patientEntries.map((e) =>
            (e.resource as Patient).id
        );
        assertTrue(
            includedPatientIds.includes(patient1.id),
            "Should include first patient",
        );
        assertTrue(
            includedPatientIds.includes(patient2.id),
            "Should include second patient",
        );

        // Verify patient references in encounters match included patients
        encounterEntries.forEach((e) => {
            const encounter = e.resource as Encounter;
            const refString = encounter.subject?.reference ?? "";
            const lastSlash = refString.lastIndexOf("/");
            const patientRef = refString.substring(lastSlash + 1);
            assertTrue(
                includedPatientIds.includes(patientRef),
                `Encounter subject reference should match an included patient: ${patientRef}`,
            );
        });
    });
}
