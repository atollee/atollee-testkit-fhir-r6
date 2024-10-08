// tests/search/parameters/contains_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    createTestStructureDefinition,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    OperationOutcome,
    Patient,
    StructureDefinition,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runContainsModifierTests(context: ITestContext) {
    it("Should find patients with family name containing the search string (case-insensitive)", async () => {
        const testCases = [
            { name: uniqueString("Son"), expected: true },
            { name: uniqueString("Sonder"), expected: true },
            { name: uniqueString("Erikson"), expected: true },
            { name: uniqueString("Samsonite"), expected: true },
            { name: uniqueString("Johnson"), expected: true },
            { name: uniqueString("Smith"), expected: false },
        ];

        for (const testCase of testCases) {
            await createTestPatient(context, {
                name: [{ family: testCase.name }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:contains=son`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with contains modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        for (const testCase of testCases) {
            const patientFound = bundle.entry?.some((entry) => {
                const patient = entry.resource as Patient;
                return patient.name?.[0].family === testCase.name;
            });
            assertEquals(
                patientFound,
                testCase.expected,
                `Patient with family name "${testCase.name}" ${
                    testCase.expected ? "should" : "should not"
                } be found`,
            );
        }
    });

    it("Should match anywhere in the string (start, middle, end)", async () => {
        const testCases = [
            { name: uniqueString("Anderson"), position: "end" },
            { name: uniqueString("Sonny"), position: "start" },
            { name: uniqueString("Pearson"), position: "middle" },
        ];

        for (const testCase of testCases) {
            await createTestPatient(context, {
                name: [{ family: testCase.name }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:contains=son`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry?.length,
            testCases.length,
            `Should find ${testCases.length} patients`,
        );

        for (const testCase of testCases) {
            assertTrue(
                bundle.entry?.some((entry) =>
                    (entry.resource as Patient).name?.[0].family ===
                        testCase.name
                ),
                `Should find patient with name "${testCase.name}" (${testCase.position} match)`,
            );
        }
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle diacritics and combining characters", async () => {
            const testCases = [
                { name: uniqueString("Söñder"), expected: true },
                { name: uniqueString("Sonder"), expected: true },
                { name: uniqueString("Søn"), expected: true },
                { name: uniqueString("Sön"), expected: true },
            ];

            for (const testCase of testCases) {
                await createTestPatient(context, {
                    name: [{ family: testCase.name }],
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?family:contains=son`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");

            for (const testCase of testCases) {
                const patientFound = bundle.entry?.some((entry) => {
                    const patient = entry.resource as Patient;
                    return patient.name?.[0].family === testCase.name;
                });
                assertEquals(
                    patientFound,
                    testCase.expected,
                    `Patient with family name "${testCase.name}" ${
                        testCase.expected ? "should" : "should not"
                    } be found`,
                );
            }
        });
    }

    if (context.isHapiBugsDisallowed()) {
        it("Should reject contains modifier on non-string, non-uri search parameters", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?birthdate:contains=2000`,
            });

            assertEquals(
                response.status,
                400,
                "Server should reject contains modifier on non-string, non-uri search parameters",
            );
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertExists(
                operationOutcome.issue,
                "OperationOutcome should contain issues",
            );
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.severity === "error"
                ),
                "OperationOutcome should contain an error",
            );
        });
    }
}
