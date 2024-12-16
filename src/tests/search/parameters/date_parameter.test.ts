// tests/search/parameters/date_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
    createTestProcedure,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { createTestMedicationStatement } from "../../utils/creators/create_medication_statement.ts";
import { DateTime, Duration } from "npm:luxon";

export function runDateParameterTests(context: ITestContext) {
    it("Should search using full date-time format", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "date-time-test",
            effectiveDateTime: "2023-05-01T12:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05-01T12:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process full date-time search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the full date-time",
        );
    });

    it("Should search using partial date format", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "partial-date-test",
            effectiveDateTime: "2023-05-01T12:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process partial date search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the partial date",
        );
    });

    it("Should handle timezone in date search", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "timezone-test",
            effectiveDateTime: "2023-05-01T12:00:00+02:00",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05-01T10:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process timezone-aware date search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the timezone-adjusted date",
        );
    });

    it("Should search on date datatype", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "date-type-test",
            effectiveDateTime: "2023-05-01",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process date datatype search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the date",
        );
    });

    it("Should search on dateTime datatype", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "datetime-type-test",
            effectiveDateTime: "2023-05-01T12:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05-01T12:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process dateTime datatype search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the dateTime",
        );
    });

    it("Should search on instant datatype", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "instant-type-test",
            effectiveDateTime: "2023-05-01T12:00:00.123Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2023-05-01T12:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process instant datatype search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation matching the instant",
        );
    });
    it("Should search on Period datatype", async () => {
        const patient = await createTestPatient(context);
        const medidcationStatement = await createTestMedicationStatement(
            context,
            patient.id!,
            {
                status: "active",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                effectivePeriod: {
                    start: "2023-05-01",
                    end: "2023-05-07",
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationStatement?effective=2023-05-03&subject=${medidcationStatement.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process Period datatype search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 medication statement matching the date within the effective period",
        );
    });

    it("Should search on Timing datatype", async () => {
        const patient = await createTestPatient(context);
        const statement = await createTestMedicationStatement(
            context,
            patient.id!,
            {
                status: "active",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                effectivePeriod: {
                    start: "2023-05-01",
                    end: "2023-05-31",
                },
                dosage: [{
                    timing: {
                        repeat: {
                            frequency: 1,
                            period: 2,
                            periodUnit: "d",
                        },
                    },
                }],
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationStatement?effective=2023-05-15&subject=${statement.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process Effective Period search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 medication statement matching the date within the effective period",
        );
    });

    it("Should search with eq prefix", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "eq-test-1",
            effectiveDateTime: "2013-01-14T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "eq-test-2",
            effectiveDateTime: "2013-01-14T10:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "eq-test-3",
            effectiveDateTime: "2013-01-15T00:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=eq2013-01-14`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process eq prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations matching eq2013-01-14",
        );
    });

    it("Should search with ne prefix", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "ne-test-1",
            effectiveDateTime: "2013-01-14T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "ne-test-2",
            effectiveDateTime: "2013-01-14T10:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "ne-test-3",
            effectiveDateTime: "2013-01-15T00:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=ne2013-01-14`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process ne prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation not matching 2013-01-14",
        );
    });

    it("Should search with lt prefix", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "lt-test-1",
            effectiveDateTime: "2013-01-14T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "lt-test-2",
            effectiveDateTime: "2013-01-14T09:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "lt-test-3",
            effectiveDateTime: "2013-01-14T11:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=lt2013-01-14T10:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process lt prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations before 2013-01-14T10:00",
        );
    });

    it("Should search with gt prefix", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "gt-test-1",
            effectiveDateTime: "2013-01-14T09:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "gt-test-2",
            effectiveDateTime: "2013-01-14T11:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "gt-test-3",
            effectiveDateTime: "2013-01-15T00:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=gt2013-01-14T10:00`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process gt prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations after 2013-01-14T10:00",
        );
    });

    it("Should search with ge prefix", async () => {
        const patient = await createTestPatient(context);
        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                dosageInstruction: [{
                    timing: {
                        event: ["2013-03-14"], // On the search date
                    },
                }],
            },
        );
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-03-15"], // After the search date
                },
            }],
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-01-21"], // Before the search date
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?date=ge2013-03-14&subject=${medicationRequest.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process ge prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 medication requests to be administered on or after 2013-03-14",
        );
    });

    it("Should search with le prefix", async () => {
        const patient = await createTestPatient(context);
        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                dosageInstruction: [{
                    timing: {
                        event: ["2013-03-14"], // On the search date
                    },
                }],
            },
        );
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-01-21"], // Before the search date
                },
            }],
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-03-15"], // After the search date
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?date=le2013-03-14&subject=${medicationRequest.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process le prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 medication requests to be administered on or before 2013-03-14",
        );
    });

    it("Should search with sa prefix", async () => {
        const patient = await createTestPatient(context);
        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                dosageInstruction: [{
                    timing: {
                        event: ["2013-03-15"],
                    },
                }],
            },
        );
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-03-14"],
                },
            }],
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-01-21"],
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?date=sa2013-03-14&subject=${medicationRequest.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process sa prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 medication request to be administered after 2013-03-14",
        );
    });

    it("Should search with eb prefix", async () => {
        const patient = await createTestPatient(context);
        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                status: "active",
                intent: "order",
                medicationCodeableConcept: {
                    coding: [{
                        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                        code: "1049502",
                        display: "Acetaminophen 325 MG Oral Tablet",
                    }],
                },
                dosageInstruction: [{
                    timing: {
                        event: ["2013-03-15"], // This is after the search date
                    },
                }],
            },
        );
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-03-14"], // This is on the search date
                },
            }],
        });
        await createTestMedicationRequest(context, patient.id!, {
            status: "active",
            intent: "order",
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                    display: "Acetaminophen 325 MG Oral Tablet",
                }],
            },
            dosageInstruction: [{
                timing: {
                    event: ["2013-01-21"], // This is before the search date
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?date=eb2013-03-14&subject=${medicationRequest.subject.reference}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process eb prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 medication request to be administered before 2013-03-14",
        );
    });

    if (context.isApproximateSearchSupported()) {
        it("Should search with ap prefix for a specific day", async () => {
            const approximityPercentage = context.getApproximitySearchRange();
            const serverTimezone = context.getServerTimezone();
            const baseDate = DateTime.fromISO("2013-03-14").startOf("day")
                .setZone(serverTimezone);
            const rangeHours = 24 * (approximityPercentage / 100);
            const lowerBound = baseDate.minus({ hours: rangeHours });

            const patient = await createTestPatient(context);

            // Helper function to create observations at specific points within the range
            const createObservationAtOffset = async (
                code: string,
                offsetPercentage: number,
            ) => {
                const offset = Duration.fromObject({
                    hours: (24 + rangeHours) * offsetPercentage,
                });
                const effectiveDateTime = lowerBound.plus(offset).toISO();
                return await createTestObservation(context, patient.id!, {
                    code,
                    effectiveDateTime,
                });
            };

            // Create observations at various points within and outside the range
            const observation = await createObservationAtOffset(
                "ap-test-1",
                0.05,
            ); // Exact match (noon)
            await createObservationAtOffset("ap-test-2", 0.7); // 70% into the range
            await createObservationAtOffset("ap-test-3", 0.3); // 30% into the range (before noon)
            await createObservationAtOffset("ap-test-4", 1.1); // Just outside upper bound
            await createObservationAtOffset("ap-test-5", -0.1); // Just outside lower bound

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?date=ap2013-03-14&subject=${observation.subject?.reference}`,
            });

            assertTrue(
                response.status === 200,
                "Server should process ap prefix search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                `Should find 3 observations approximately matching 2013-03-14 within ${approximityPercentage}% of a day`,
            );

            // Verify the matched observations
            const matchedCodes = bundle.entry.map((entry) =>
                (entry.resource as Observation).code?.coding?.[0]?.code
            );
            assertTrue(
                matchedCodes.includes("ap-test-1"),
                "Should match the exact date",
            );
            assertTrue(
                matchedCodes.includes("ap-test-2"),
                "Should match the date 70% into the range",
            );
            assertTrue(
                matchedCodes.includes("ap-test-3"),
                "Should match the date 30% into the range",
            );
            assertTrue(
                !matchedCodes.includes("ap-test-4"),
                "Should not match the date just outside upper bound",
            );
            assertTrue(
                !matchedCodes.includes("ap-test-5"),
                "Should not match the date just outside lower bound",
            );
        });
    }

    it("Should handle range comparison correctly", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "range-test-1",
            effectiveDateTime: "2013-01-14T12:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "range-test-2",
            effectiveDateTime: "2013-01-15T00:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=gt2013-01-14`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process range comparison correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observations with any part after 2013-01-14",
        );
    });

    it("Should handle boundary comparison correctly", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "boundary-test-1",
            effectiveDateTime: "2013-01-14T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "boundary-test-2",
            effectiveDateTime: "2013-01-15T00:00:00Z",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=sa2013-01-14T00:00:00Z`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process boundary comparison correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation starting after 2013-01-14T00:00:00",
        );
    });

    it("Should handle partially specified dates - year only", async () => {
        const patient = await createTestPatient(context);

        // Create observations using local server time
        const serverTimezone = context.getServerTimezone(); // You'll need to implement this function
        const year2000Start = DateTime.fromObject({ year: 2000 }, {
            zone: serverTimezone,
        }).startOf("year");
        const year2000End = DateTime.fromObject({ year: 2000 }, {
            zone: serverTimezone,
        }).endOf("year");
        const year2001Start = DateTime.fromObject({ year: 2001 }, {
            zone: serverTimezone,
        }).startOf("year");

        await createTestObservation(context, patient.id!, {
            code: "year-test-1",
            effectiveDateTime: year2000Start.toISO(),
        });
        await createTestObservation(context, patient.id!, {
            code: "year-test-2",
            effectiveDateTime: year2000End.toISO(),
        });
        await createTestObservation(context, patient.id!, {
            code: "year-test-3",
            effectiveDateTime: year2001Start.toISO(),
        });
        // console.log("2000 start: " + year2000Start.toISO());
        // console.log("2000 end: " + year2000End.toISO());
        // console.log("2001 start: " + year2001Start.toISO());

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2000`,
        });

        assertEquals(
            response.status,
            200,
            "Server should handle year-only date search correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations in the year 2000 server time",
        );

        // Additional checks to ensure correct observations are returned
        const observationCodes = bundle.entry.map((entry) =>
            (entry.resource as Observation).code.coding![0].code
        );
        assertTrue(
            observationCodes.includes("year-test-1"),
            "Should include the observation from the start of 2000",
        );
        assertTrue(
            observationCodes.includes("year-test-2"),
            "Should include the observation from the end of 2000",
        );
        assertFalse(
            observationCodes.includes("year-test-3"),
            "Should not include the observation from 2001",
        );
    });

    it("Should handle partially specified dates - year and month", async () => {
        const patient = await createTestPatient(context);

        // Get server timezone
        const serverTimezone = context.getServerTimezone();

        // Create DateTime objects for the start and end of April 2000, and start of May 2000 in server time
        const april2000Start = DateTime.fromObject({ year: 2000, month: 4 }, {
            zone: serverTimezone,
        }).startOf("month");
        const april2000End = DateTime.fromObject({ year: 2000, month: 4 }, {
            zone: serverTimezone,
        }).endOf("month");
        const may2000Start = DateTime.fromObject({ year: 2000, month: 5 }, {
            zone: serverTimezone,
        }).startOf("month");

        await createTestObservation(context, patient.id!, {
            code: "month-test-1",
            effectiveDateTime: april2000Start.toISO(),
        });
        await createTestObservation(context, patient.id!, {
            code: "month-test-2",
            effectiveDateTime: april2000End.toISO(),
        });
        await createTestObservation(context, patient.id!, {
            code: "month-test-3",
            effectiveDateTime: may2000Start.toISO(),
        });

        // console.log("April 2000 start: " + april2000Start.toISO());
        // console.log("April 2000 end: " + april2000End.toISO());
        // console.log("May 2000 start: " + may2000Start.toISO());

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2000-04`,
        });

        assertEquals(
            response.status,
            200,
            "Server should handle year-month date search correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations in April 2000 server time",
        );

        // Additional checks to ensure correct observations are returned
        const observationCodes = bundle.entry.map((entry) =>
            (entry.resource as Observation).code.coding![0].code
        );
        assertTrue(
            observationCodes.includes("month-test-1"),
            "Should include the observation from the start of April 2000",
        );
        assertTrue(
            observationCodes.includes("month-test-2"),
            "Should include the observation from the end of April 2000",
        );
        assertFalse(
            observationCodes.includes("month-test-3"),
            "Should not include the observation from May 2000",
        );
    });

    it("Should handle timezone corrections", async () => {
        const patient = await createTestPatient(context);
        const serverTimezone = await context.getServerTimezone();

        // Create a DateTime object for 2000-01-01 00:00:00 in the server's timezone
        const baseDateTime = DateTime.fromObject(
            { year: 2000, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
            { zone: serverTimezone },
        );

        // Create observations with the same clock time but in different timezones
        await createTestObservation(context, patient.id!, {
            code: "timezone-test-1",
            effectiveDateTime: baseDateTime.setZone("UTC+02:00").toISO(),
        });
        await createTestObservation(context, patient.id!, {
            code: "timezone-test-2",
            effectiveDateTime: baseDateTime.setZone("UTC-02:00").toISO(),
        });

        // Create an observation just outside the day in server time
        await createTestObservation(context, patient.id!, {
            code: "timezone-test-3",
            effectiveDateTime: baseDateTime.minus({ minutes: 1 }).toISO(),
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=2000-01-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should handle timezone corrections correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // The number of observations returned depends on the server's timezone
        const utcOffset = baseDateTime.offset / 60; // Convert minutes to hours
        const expectedObservations = (utcOffset >= -2 && utcOffset <= 2)
            ? 2
            : 1;

        assertEquals(
            bundle.entry.length,
            expectedObservations,
            `Should find ${expectedObservations} observation(s) on 2000-01-01 in server timezone`,
        );

        // Additional checks to ensure correct observations are returned
        const observationCodes = bundle.entry.map((entry) =>
            (entry.resource as Observation).code.coding![0].code
        );

        if (utcOffset >= 0 && utcOffset <= 2) {
            assertTrue(
                observationCodes.includes("timezone-test-1"),
                "Should include the observation from UTC+02:00",
            );
        }

        if (utcOffset >= -2 && utcOffset <= 0) {
            assertTrue(
                observationCodes.includes("timezone-test-2"),
                "Should include the observation from UTC-02:00",
            );
        }

        assertFalse(
            observationCodes.includes("timezone-test-3"),
            "Should not include the observation from just before the day started",
        );
    });

    it("Should search procedures in patient compartment over a 2-year period", async () => {
        await createTestPatient(context);
        await createTestProcedure(context, {
            code: "procedure-test-1",
            performedDateTime: "2010-06-15",
        });
        await createTestProcedure(context, {
            code: "procedure-test-2",
            performedDateTime: "2011-06-15",
        });
        await createTestProcedure(context, {
            code: "procedure-test-3",
            performedDateTime: "2012-06-15",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Procedure?date=ge2010-01-01&date=le2011-12-31`,
        });

        assertEquals(
            response.status,
            200,
            "Server should handle patient compartment procedure search correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 procedures in the 2-year period",
        );
    });
}
