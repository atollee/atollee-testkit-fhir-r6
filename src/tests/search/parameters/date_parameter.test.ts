// tests/search/parameters/date_parameter.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
    createTestProcedure,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runDateParameterTests(context: ITestContext) {
    it("Should search using full date-time format", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "date-time-test",
            effectiveDateTime: "2023-05-01T12:00:00Z",
        });

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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
            issued: "2023-05-01T12:00:00.123Z",
        });

        const response = await fetchWrapper({
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
                    repeat: {
                        boundsPeriod: {
                            start: "2023-05-01",
                            end: "2023-05-07",
                        },
                    },
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?date=2023-05-03`,
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
            "Should find 1 medication request matching the date within the period",
        );

        it("Should search on Timing datatype", async () => {
            const patient = await createTestPatient(context);
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
                        repeat: {
                            boundsPeriod: {
                                start: "2023-05-01",
                                end: "2023-05-31",
                            },
                            frequency: 1,
                            period: 2,
                            periodUnit: "d",
                        },
                    },
                }],
            });

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `MedicationRequest?date=2023-05-15`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process Timing datatype search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Should find 1 medication request matching the date within the timing",
            );
        });
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=lt2013-01-14T10:00`,
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

        const response = await fetchWrapper({
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-21",
                            end: "2013-12-31",
                        },
                    },
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?date=ge2013-03-14`,
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
            1,
            "Should find 1 medication request on or after 2013-03-14",
        );
    });

    it("Should search with le prefix", async () => {
        const patient = await createTestPatient(context);
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-21",
                            end: "2013-12-31",
                        },
                    },
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?date=le2013-03-14`,
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
            1,
            "Should find 1 medication request on or before 2013-03-14",
        );
    });
    it("Should search with sa prefix", async () => {
        const patient = await createTestPatient(context);
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-03-15",
                            end: "2013-12-31",
                        },
                    },
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-21",
                            end: "2013-12-31",
                        },
                    },
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-01",
                            end: "2013-01-21",
                        },
                    },
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?date=sa2013-03-14`,
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
            "Should find 1 medication request starting after 2013-03-14",
        );
    });

    it("Should search with eb prefix", async () => {
        const patient = await createTestPatient(context);
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-03-15",
                            end: "2013-12-31",
                        },
                    },
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-21",
                            end: "2013-12-31",
                        },
                    },
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
                    repeat: {
                        boundsPeriod: {
                            start: "2013-01-01",
                            end: "2013-01-21",
                        },
                    },
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `MedicationRequest?date=eb2013-03-14`,
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
            "Should find 1 medication request ending before 2013-03-14",
        );
    });

    it("Should search with ap prefix", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "ap-test-1",
            effectiveDateTime: "2013-03-14",
        });
        await createTestObservation(context, patient.id!, {
            code: "ap-test-2",
            effectiveDateTime: "2013-01-21",
        });
        await createTestObservation(context, patient.id!, {
            code: "ap-test-3",
            effectiveDateTime: "2015-06-15",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=ap2013-03-14`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process ap prefix search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations approximately matching 2013-03-14",
        );
    });
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

        const response = await fetchWrapper({
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
            2,
            "Should find 2 observations with any part after 2013-01-14",
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

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=sa2013-01-14T00:00:00`,
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
        await createTestObservation(context, patient.id!, {
            code: "year-test-1",
            effectiveDateTime: "2000-01-01T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "year-test-2",
            effectiveDateTime: "2000-12-31T23:59:59Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "year-test-3",
            effectiveDateTime: "2001-01-01T00:00:00Z",
        });

        const response = await fetchWrapper({
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
            "Should find 2 observations in the year 2000",
        );
    });

    it("Should handle partially specified dates - year and month", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "month-test-1",
            effectiveDateTime: "2000-04-01T00:00:00Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "month-test-2",
            effectiveDateTime: "2000-04-30T23:59:59Z",
        });
        await createTestObservation(context, patient.id!, {
            code: "month-test-3",
            effectiveDateTime: "2000-05-01T00:00:00Z",
        });

        const response = await fetchWrapper({
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
            "Should find 2 observations in April 2000",
        );
    });

    it("Should handle timezone corrections", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "timezone-test-1",
            effectiveDateTime: "2000-01-01T00:00:00+02:00",
        });
        await createTestObservation(context, patient.id!, {
            code: "timezone-test-2",
            effectiveDateTime: "2000-01-01T00:00:00-02:00",
        });

        const response = await fetchWrapper({
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
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations on 2000-01-01 regardless of timezone",
        );
    });

    it("Should search procedures in patient compartment over a 2-year period", async () => {
        const patient = await createTestPatient(context);
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

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${patient.id}/Procedure?date=ge2010-01-01&date=le2011-12-31`,
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
