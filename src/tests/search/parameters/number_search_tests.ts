// tests/search/parameters/number_search_tests.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestImmunizationRecommendation,
    createTestObservation,
    createTestPatient,
    createTestRiskAssessment,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, RiskAssessment } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runNumberSearchTests(context: ITestContext) {
    it("Should search for values with different precisions", async () => {
        const patient = await createTestPatient(context);
        const testValues = [99.6, 99.996, 100, 100.004, 100.4];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const precisionTests = [
            { search: "100", expectedCount: 3 },
            { search: "100.00", expectedCount: 1 },
            { search: "1e2", expectedCount: 5 },
        ];

        for (const test of precisionTests) {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?value-quantity=${test.search}`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search with ${test.search} successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle should contain entries for ${test.search}`,
            );
            assertEquals(
                bundle.entry.length,
                test.expectedCount,
                `Should find ${test.expectedCount} observations for ${test.search}`,
            );
        }
    });

    it("Should search using comparison prefixes", async () => {
        const patient = await createTestPatient(context);
        const testValues = [99, 100, 101];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const prefixTests = [
            { prefix: "lt", expectedCount: 1 },
            { prefix: "le", expectedCount: 2 },
            { prefix: "gt", expectedCount: 1 },
            { prefix: "ge", expectedCount: 2 },
            { prefix: "ne", expectedCount: 2 },
        ];

        for (const test of prefixTests) {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?value-quantity=${test.prefix}100`,
            });

            assertEquals(
                response.status,
                200,
                `Server should process search with ${test.prefix}100 successfully`,
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry,
                `Bundle should contain entries for ${test.prefix}100`,
            );
            assertEquals(
                bundle.entry.length,
                test.expectedCount,
                `Should find ${test.expectedCount} observations for ${test.prefix}100`,
            );
        }
    });

    it("Should handle integer searches exactly", async () => {
        const patient = await createTestPatient(context);
        const testDoses = [1, 2, 3];

        for (const dose of testDoses) {
            await createTestImmunizationRecommendation(context, {
                patient: { reference: `Patient/${patient.id}` },
                recommendation: [{
                    doseNumber: dose,
                    forecastStatus: {
                        coding: [{
                            system:
                                "http://terminology.hl7.org/CodeSystem/immunization-recommendation-status",
                            code: "due",
                        }],
                    },
                }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ImmunizationRecommendation?dose-number=2`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process integer search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for integer search",
        );
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one ImmunizationRecommendation with dose number 2",
        );
    });

    it("Should search for risk assessments with probability in prediction", async () => {
        const patient = await createTestPatient(context);
        const testProbabilities = [0.7, 0.8, 0.9];

        for (const probability of testProbabilities) {
            await createTestRiskAssessment(context, {
                subject: { reference: `Patient/${patient.id}` },
                prediction: [{
                    probabilityDecimal: probability,
                    outcome: {
                        text: "Test outcome",
                    },
                }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `RiskAssessment?probability=gt0.8`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process probability search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for probability search",
        );
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one RiskAssessment with probability greater than 0.8",
        );

        const riskAssessment = bundle.entry[0].resource as RiskAssessment;
        assertEquals(
            riskAssessment.prediction?.[0].probabilityDecimal,
            0.9,
            "Found RiskAssessment should have probability 0.9 in its prediction",
        );
    });

    it("Should handle exponential form in searches", async () => {
        const patient = await createTestPatient(context);
        const testValues = [0.07, 0.08, 0.09];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg/dL",
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt8e-2`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process exponential form search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(
            bundle.entry,
            "Bundle should contain entries for exponential form search",
        );
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one Observation with value greater than 8e-2",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.valueQuantity?.value,
            0.09,
            "Found Observation should have value 0.09",
        );
    });
}
