// tests/search/parameters/relevance_score.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runRelevanceScoreTests(context: ITestContext) {
    it("Should return relevance scores when using a non-deterministic sort", async () => {
        // Create patients with varying degrees of match to a search criteria
        await createTestPatient(context, {
            name: [{ given: ["John"], family: "Doe" }],
        });
        await createTestPatient(context, {
            name: [{ given: ["Jane"], family: "Doe" }],
        });
        await createTestPatient(context, {
            name: [{ given: ["John"], family: "Smith" }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=John&_sort=_score`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        bundle.entry.forEach((entry) => {
            assertExists(entry.search?.score, "Each entry should have a score");
            assertTrue(
                entry.search!.score! > 0,
                "Score should be greater than 0",
            );
            assertTrue(
                entry.search!.score! <= 1,
                "Score should be less than or equal to 1",
            );
        });

        // Check if scores are in descending order
        const scores = bundle.entry.map((entry) => entry.search!.score!);
        assertTrue(
            scores.every((score, index) =>
                index === 0 || score <= scores[index - 1]
            ),
            "Scores should be in descending order",
        );
    });

    it("Should return higher scores for better matches", async () => {
        const exactMatchName = uniqueString("ExactMatch");
        const partialMatchName = uniqueString("PartialMatch");

        await createTestPatient(context, {
            name: [{ given: [exactMatchName], family: "Doe" }],
        });
        await createTestPatient(context, {
            name: [{ given: [partialMatchName], family: "Doe" }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${exactMatchName}&_sort=_score`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const exactMatchScore = bundle.entry.find((entry) =>
            (entry.resource as Patient).name![0].given![0] === exactMatchName
        )?.search?.score;

        const partialMatchScore = bundle.entry.find((entry) =>
            (entry.resource as Patient).name![0].given![0] === partialMatchName
        )?.search?.score;

        assertExists(exactMatchScore, "Exact match should have a score");
        assertExists(partialMatchScore, "Partial match should have a score");
        assertTrue(
            exactMatchScore! > partialMatchScore!,
            "Exact match should have a higher score than partial match",
        );
    });

    it("Should not return scores when not using _score sort", async () => {
        await createTestPatient(context, {
            name: [{ given: ["John"], family: "Doe" }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=John`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        bundle.entry.forEach((entry) => {
            assertEquals(
                entry.search?.score,
                undefined,
                "Entries should not have scores when not using _score sort",
            );
        });
    });

    it("Should handle _score parameter in combination with other search parameters", async () => {
        const uniqueName = uniqueString("TestName");
        await createTestPatient(context, {
            name: [{ given: [uniqueName], family: "Doe" }],
            gender: "male",
        });
        await createTestPatient(context, {
            name: [{ given: [uniqueName], family: "Smith" }],
            gender: "female",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueName}&gender=male&_sort=_score`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should return only one patient matching both criteria",
        );
        assertExists(
            bundle.entry[0].search?.score,
            "Matching entry should have a score",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).gender,
            "male",
            "Returned patient should be male",
        );
    });
}
