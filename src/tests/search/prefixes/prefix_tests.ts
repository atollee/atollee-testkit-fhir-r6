// tests/search/prefixes/prefix_tests.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runPrefixTests(context: ITestContext) {
    it("Should search for observations with number prefixes", async () => {
        const patient = await createTestPatient(context);
        const testValues = [50, 60, 70, 80, 90, 100];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const prefixTests = [
            { prefix: "eq", value: 70, expectedCount: 1 },
            { prefix: "ne", value: 70, expectedCount: 5 },
            { prefix: "gt", value: 70, expectedCount: 3 },
            { prefix: "lt", value: 70, expectedCount: 2 },
            { prefix: "ge", value: 70, expectedCount: 4 },
            { prefix: "le", value: 70, expectedCount: 3 },
        ];

        for (const test of prefixTests) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?value-quantity=${test.prefix}${test.value}`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search with ${test.prefix} prefix successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle should contain entries for ${test.prefix} prefix`,
            );
            assertEquals(
                bundle.entry.length,
                test.expectedCount,
                `Should find ${test.expectedCount} observations for ${test.prefix}${test.value}`,
            );
        }
    });

    it("Should search for observations with date prefixes", async () => {
        const patient = await createTestPatient(context);
        const baseDate = new Date("2023-01-01");
        const testDates = [
            new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
            new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            baseDate,
            new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        ];

        for (const date of testDates) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                effectiveDateTime: date.toISOString(),
            });
        }

        const prefixTests = [
            { prefix: "eq", value: "2023-01-01", expectedCount: 1 },
            { prefix: "ne", value: "2023-01-01", expectedCount: 4 },
            { prefix: "gt", value: "2023-01-01", expectedCount: 2 },
            { prefix: "lt", value: "2023-01-01", expectedCount: 2 },
            { prefix: "ge", value: "2023-01-01", expectedCount: 3 },
            { prefix: "le", value: "2023-01-01", expectedCount: 3 },
            { prefix: "sa", value: "2023-01-01", expectedCount: 2 },
            { prefix: "eb", value: "2023-01-01", expectedCount: 2 },
        ];

        for (const test of prefixTests) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `Observation?date=${test.prefix}${test.value}`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search with ${test.prefix} prefix successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle should contain entries for ${test.prefix} prefix`,
            );
            assertEquals(
                bundle.entry.length,
                test.expectedCount,
                `Should find ${test.expectedCount} observations for ${test.prefix}${test.value}`,
            );
        }
    });

    it("Should search for observations with quantity prefixes", async () => {
        const patient = await createTestPatient(context);
        const testValues = [50, 60, 70, 80, 90, 100];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const prefixTests = [
            {
                prefix: "eq",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 1,
            },
            {
                prefix: "ne",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 5,
            },
            {
                prefix: "gt",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 3,
            },
            {
                prefix: "lt",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 2,
            },
            {
                prefix: "ge",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 4,
            },
            {
                prefix: "le",
                value: "70|http://unitsofmeasure.org|mg/dL",
                expectedCount: 3,
            },
        ];

        for (const test of prefixTests) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?value-quantity=${test.prefix}${test.value}`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search with ${test.prefix} prefix successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle should contain entries for ${test.prefix} prefix`,
            );
            assertEquals(
                bundle.entry.length,
                test.expectedCount,
                `Should find ${test.expectedCount} observations for ${test.prefix}${test.value}`,
            );
        }
    });

    it("Should handle approximate prefix (ap) for number searches", async () => {
        const patient = await createTestPatient(context);
        const testValues = [95, 98, 100, 102, 105];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=ap100`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with ap prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for ap prefix",
        );
        assertEquals(
            bundle.entry.length,
            3,
            "Should find 3 observations for ap100 (98, 100, 102)",
        );
    });

    it("Should handle multiple prefixes in a single search", async () => {
        const patient = await createTestPatient(context);
        const testValues = [50, 60, 70, 80, 90, 100];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt60&value-quantity=lt90`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with multiple prefixes successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for multiple prefixes",
        );
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations for gt60 and lt90 (70, 80)",
        );
    });

    it("Should handle prefixes with date ranges", async () => {
        const patient = await createTestPatient(context);
        const baseDate = new Date("2023-01-01");
        const testDates = [
            new Date(baseDate.getTime() - 2 * 24 * 60 * 60 * 1000),
            new Date(baseDate.getTime() - 1 * 24 * 60 * 60 * 1000),
            baseDate,
            new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000),
            new Date(baseDate.getTime() + 2 * 24 * 60 * 60 * 1000),
        ];

        for (const date of testDates) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                effectiveDateTime: date.toISOString(),
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=ge2022-12-31&date=le2023-01-02`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with date range successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for date range",
        );
        assertEquals(
            bundle.entry.length,
            3,
            "Should find 3 observations within the date range",
        );
    });

    it("Should handle prefixes with partial dates", async () => {
        const patient = await createTestPatient(context);
        const testDates = [
            "2023-01-01T12:00:00Z",
            "2023-02-15T14:30:00Z",
            "2023-03-30T09:45:00Z",
            "2023-04-10T16:20:00Z",
        ];

        for (const date of testDates) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                effectiveDateTime: date,
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=ge2023-02`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with partial date successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for partial date",
        );
        assertEquals(
            bundle.entry.length,
            3,
            "Should find 3 observations from February 2023 onwards",
        );
    });

    it("Should handle prefixes with time-based searches", async () => {
        const patient = await createTestPatient(context);
        const testDates = [
            "2023-01-01T08:00:00Z",
            "2023-01-01T12:30:00Z",
            "2023-01-01T16:45:00Z",
            "2023-01-01T20:15:00Z",
        ];

        for (const date of testDates) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 100,
                unit: "mg/dL",
                effectiveDateTime: date,
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=gt2023-01-01T12:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with time-based prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for time-based search",
        );
        assertEquals(
            bundle.entry.length,
            3,
            "Should find 3 observations after 12:00:00",
        );
    });

    it("Should handle prefixes with quantity searches including units", async () => {
        const patient = await createTestPatient(context);
        const testValues = [
            { value: 50, unit: "mg/dL" },
            { value: 2.5, unit: "mmol/L" }, // Approximately 45 mg/dL
            { value: 70, unit: "mg/dL" },
            { value: 3.9, unit: "mmol/L" }, // Approximately 70 mg/dL
            { value: 90, unit: "mg/dL" },
        ];

        for (const { value, unit } of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: unit,
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?value-quantity=gt60|http://unitsofmeasure.org|mg/dL`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with quantity and units successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for quantity search with units",
        );
        assertEquals(
            bundle.entry.length,
            4,
            "Should find 4 observations greater than 60 mg/dL (or equivalent)",
        );
    });

    it("Should use 'eq' as default prefix when no prefix is specified", async () => {
        const patient = await createTestPatient(context);
        const testValues = [69, 70, 71];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=70`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with implicit eq prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for implicit eq prefix",
        );
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for implicit eq70",
        );
    });

    it("Should handle 'sa' and 'eb' prefixes with decimal values", async () => {
        const patient = await createTestPatient(context);
        const testValues = [1.9, 2.0, 2.1];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const saResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=sa2.0`,
        });

        assertEquals(
            saResponse.status,
            200,
            "Server should process search with sa prefix successfully",
        );
        const saBundle = saResponse.jsonBody as Bundle;
        assertExists(
            saBundle.entry,
            "Bundle should contain entries for sa prefix",
        );
        assertEquals(
            saBundle.entry.length,
            1,
            "Should find 1 observation for sa2.0",
        );

        const ebResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=eb2.0`,
        });

        assertEquals(
            ebResponse.status,
            200,
            "Server should process search with eb prefix successfully",
        );
        const ebBundle = ebResponse.jsonBody as Bundle;
        assertExists(
            ebBundle.entry,
            "Bundle should contain entries for eb prefix",
        );
        assertEquals(
            ebBundle.entry.length,
            1,
            "Should find 1 observation for eb2.0",
        );
    });

    it("Should handle prefix behavior with missing values", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            // No value or unit specified
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt0`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with prefix on missing value successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            0,
            "Should find 0 observations for gt0 when value is missing",
        );
    });

    it("Should handle prefix behavior with Range type", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            system: "http://loinc.org",
            valueRange: {
                low: { value: 50, unit: "mg/dL" },
                high: { value: 70, unit: "mg/dL" },
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt60`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with prefix on Range type successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for gt60 with Range type",
        );
    });

    it("Should handle prefixes in 'or' joined search parameter values", async () => {
        const patient = await createTestPatient(context);
        const testValues = [50, 70, 90];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=lt60,gt80`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with 'or' joined prefixes successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for 'or' joined prefixes",
        );
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations for lt60,gt80",
        );
    });
}
