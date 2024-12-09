import {
    assertEquals,
    assertExists,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    fetchSearchWrapper,
    fetchWrapper,
    patchUrl,
} from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestPatient,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle, Encounter, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function compareBundles(bundle1: Bundle, bundle2: Bundle, message: string) {
    // Compare total counts
    assertEquals(
        bundle1.total,
        bundle2.total,
        `${message}: Bundle totals should match`,
    );

    // Compare entries length
    assertEquals(
        bundle1.entry?.length,
        bundle2.entry?.length,
        `${message}: Bundle entries length should match`,
    );

    // Compare entries content
    bundle1.entry?.forEach((entry1, index) => {
        const entry2 = bundle2.entry?.[index];
        assertEquals(
            entry1.resource?.id,
            entry2?.resource?.id,
            `${message}: Resource IDs should match at index ${index}`,
        );
        assertEquals(
            entry1.resource?.resourceType,
            entry2?.resource?.resourceType,
            `${message}: Resource types should match at index ${index}`,
        );
        assertEquals(
            entry1.search?.mode,
            entry2?.search?.mode,
            `${message}: Search modes should match at index ${index}`,
        );
    });

    // Compare links
    assertEquals(
        bundle1.link?.length,
        bundle2.link?.length,
        `${message}: Bundle link counts should match`,
    );

    bundle1.link?.forEach((link1, index) => {
        const link2 = bundle2.link?.[index];
        assertEquals(
            link1.relation,
            link2?.relation,
            `${message}: Link relations should match at index ${index}`,
        );
        assertEquals(
            link1.url,
            link2?.url,
            `${message}: Link URLs should match at index ${index}`,
        );
    });
}

function compareBundlesNot(bundle1: Bundle, bundle2: Bundle, message: string) {
    // Compare total counts
    if (bundle1.total !== bundle2.total) {
        return;
    }

    // Compare entries length
    if (bundle1.entry?.length !== bundle2.entry?.length) {
        return;
    }

    // If lengths match, verify content differs
    let hasEntryDifference = false;
    bundle1.entry?.forEach((entry1, index) => {
        const entry2 = bundle2.entry?.[index];
        if (
            entry1.resource?.id !== entry2?.resource?.id ||
            entry1.resource?.resourceType !==
                entry2?.resource?.resourceType ||
            entry1.search?.mode !== entry2?.search?.mode
        ) {
            hasEntryDifference = true;
        }
    });
    assertTrue(
        hasEntryDifference,
        `${message}: Bundle entries should have different content`,
    );
}

export function runSearchBaseTests(context: ITestContext) {
    /*
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
    */
    it("Should provide correct pagination links when searching encounters and return identical results for self/first links", async () => {
        // Create test patients and encounters
        const patient = await createTestPatient(context, {
            name: [{ family: uniqueString("TestPatient") }],
        });

        // Create enough encounters to span multiple pages
        const totalEncounters = 12;
        const pageSize = 4;
        const encounters = [];

        for (let i = 0; i < totalEncounters; i++) {
            const encounter = await createTestEncounter(context, {
                subject: { reference: `Patient/${patient.id}` },
                class: {
                    system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                    code: "AMB",
                    display: "ambulatory",
                },
                status: "finished",
            });
            encounters.push(encounter);
            // Add delay to ensure different lastUpdated timestamps
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        // Fetch first page
        const firstPageResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Encounter?_count=${pageSize}&_sort=_lastUpdated`,
        });

        assertEquals(
            firstPageResponse.status,
            200,
            "First page request should be successful",
        );
        const firstPageBundle = firstPageResponse.jsonBody as Bundle;

        // Verify links exist
        assertExists(firstPageBundle.link, "First page should have links");
        const firstPageLinks = new Map(
            firstPageBundle.link.map((link) => [link.relation, link.url]),
        );

        assertExists(firstPageLinks.get("self"), "Should have self link");
        assertExists(firstPageLinks.get("first"), "Should have first link");

        // Follow self link and verify identical results
        const selfUrl = patchUrl(context, firstPageLinks.get("self")!);
        const selfLinkResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: selfUrl,
        });

        assertEquals(
            selfLinkResponse.status,
            200,
            "Self link request should be successful",
        );
        const selfLinkBundle = selfLinkResponse.jsonBody as Bundle;

        compareBundles(
            firstPageBundle,
            selfLinkBundle,
            "Self link should return identical bundle",
        );

        // Follow first link and verify identical results
        const firstUrl = patchUrl(context, firstPageLinks.get("first")!);
        const firstLinkResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: firstUrl,
        });

        assertEquals(
            firstLinkResponse.status,
            200,
            "First link request should be successful",
        );
        const firstLinkBundle = firstLinkResponse.jsonBody as Bundle;

        compareBundles(
            firstPageBundle,
            firstLinkBundle,
            "First link should return identical bundle",
        );

        // Fetch middle page and verify its self link
        const nextUrl = patchUrl(context, firstPageLinks.get("next")!);
        const middlePageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: nextUrl,
        });

        const middlePageBundle = middlePageResponse.jsonBody as Bundle;
        compareBundlesNot(
            middlePageBundle,
            firstPageBundle,
            "Middle page should not match first page",
        );
        const middlePageLinks = new Map(
            middlePageBundle.link?.map((link) => [link.relation, link.url]),
        );

        const middlePageSelfUrl = patchUrl(
            context,
            middlePageLinks.get("self")!,
        );
        const middlePageSelfResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: middlePageSelfUrl,
        });

        const middlePageSelfBundle = middlePageSelfResponse.jsonBody as Bundle;

        compareBundles(
            middlePageBundle,
            middlePageSelfBundle,
            "Middle page self link should return identical bundle",
        );
    });
}
