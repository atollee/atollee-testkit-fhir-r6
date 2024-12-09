// tests/search/parameters/quantity_search_tests.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runQuantitySearchTests(context: ITestContext) {
    it("Should search for observations with a specific value and UCUM unit", async () => {
        const patient = await createTestPatient(context);
        const testValues = [5.3, 5.4, 5.5];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg",
                valueQuantity: {
                    value: value,
                    unit: "mg",
                    system: "http://unitsofmeasure.org",
                    code: "mg",
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?value-quantity=5.4|http://unitsofmeasure.org|mg`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process quantity search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation with value 5.4 mg",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.valueQuantity?.value,
            5.4,
            "Found observation should have value 5.4",
        );
        assertEquals(
            observation.valueQuantity?.unit,
            "mg",
            "Found observation should have unit mg",
        );
    });

    it("Should search for observations with exponential notation", async () => {
        const patient = await createTestPatient(context);
        const testValues = [0.00539, 0.0054, 0.00541];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "g",
                valueQuantity: {
                    value: value,
                    unit: "g",
                    system: "http://unitsofmeasure.org",
                    code: "g",
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?value-quantity=5.40e-3|http://unitsofmeasure.org|g`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process exponential notation search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one observation with value 0.0054 g",
        );

        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.valueQuantity?.value,
            0.0054,
            "Found observation should have value 0.0054",
        );
        assertEquals(
            observation.valueQuantity?.unit,
            "g",
            "Found observation should have unit g",
        );
    });

    it("Should search for observations with a specific value and any matching unit", async () => {
        const patient = await createTestPatient(context);
        const testUnits = ["mg", "milligram", "mg/L"];

        for (const unit of testUnits) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 5.4,
                unit: unit,
                valueQuantity: {
                    value: 5.4,
                    unit: unit,
                    system: "http://unitsofmeasure.org",
                    code: unit,
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=5.4||mg`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process unit-agnostic search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find two observations with value 5.4 and matching units",
        );

        for (const entry of bundle.entry) {
            const observation = entry.resource as Observation;
            assertEquals(
                observation.valueQuantity?.value,
                5.4,
                "Found observation should have value 5.4",
            );
            assertTrue(
                ["mg", "milligram"].includes(
                    observation.valueQuantity?.unit || "",
                ),
                "Found observation should have a matching unit",
            );
        }
    });

    it("Should search for observations with a specific value regardless of unit", async () => {
        const patient = await createTestPatient(context);
        const testUnits = ["mg", "g", "kg"];

        for (const unit of testUnits) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: 5.4,
                unit: unit,
                valueQuantity: {
                    value: 5.4,
                    unit: unit,
                    system: "http://unitsofmeasure.org",
                    code: unit,
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=5.4`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process unit-less search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Should find three observations with value 5.4 regardless of unit",
        );

        for (const entry of bundle.entry) {
            const observation = entry.resource as Observation;
            assertEquals(
                observation.valueQuantity?.value,
                5.4,
                "Found observation should have value 5.4",
            );
        }
    });

    it("Should search for observations using comparison operators", async () => {
        const patient = await createTestPatient(context);
        const testValues = [5.3, 5.4, 5.5];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg",
                valueQuantity: {
                    value: value,
                    unit: "mg",
                    system: "http://unitsofmeasure.org",
                    code: "mg",
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?value-quantity=le5.4|http://unitsofmeasure.org|mg`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process comparison operator search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find two observations with value less than or equal to 5.4 mg",
        );

        for (const entry of bundle.entry) {
            const observation = entry.resource as Observation;
            assertTrue(
                observation.valueQuantity?.value &&
                    observation.valueQuantity.value <= 5.4,
                "Found observation should have value less than or equal to 5.4",
            );
            assertEquals(
                observation.valueQuantity?.unit,
                "mg",
                "Found observation should have unit mg",
            );
        }
    });

    it("Should search for observations using the 'ap' (approximately) operator", async () => {
        const patient = await createTestPatient(context);
        const testValues = [4.9, 5.2, 5.4, 5.6, 5.9];

        for (const value of testValues) {
            await createTestObservation(context, patient.id!, {
                code: "15074-8",
                system: "http://loinc.org",
                value: value,
                unit: "mg",
                valueQuantity: {
                    value: value,
                    unit: "mg",
                    system: "http://unitsofmeasure.org",
                    code: "mg",
                },
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?value-quantity=ap5.4|http://unitsofmeasure.org|mg`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process 'ap' operator search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 3,
            "Should find at least three observations with value approximately 5.4 mg",
        );

        for (const entry of bundle.entry) {
            const observation = entry.resource as Observation;
            assertTrue(
                observation.valueQuantity?.value &&
                    Math.abs(observation.valueQuantity.value - 5.4) <= 0.54,
                "Found observation should have value within 10% of 5.4",
            );
            assertEquals(
                observation.valueQuantity?.unit,
                "mg",
                "Found observation should have unit mg",
            );
        }
    });
}
