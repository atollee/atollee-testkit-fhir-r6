// tests/search/parameters/advanced_filtering.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAdvancedFilteringTests(context: ITestContext) {
    it("Should find observations with specific code and patient name using standard search", async () => {
        const patientName = uniqueString("Peter");
        const patient = await createTestPatient(context, {
            name: [{ given: [patientName], family: "TestFamily" }],
        });

        const observation = await createTestObservation(context, patient.id!, {
            code: "1234-5",
            system: "http://loinc.org",
            status: "final",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=http://loinc.org|1234-5&subject.name=${patientName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the standard search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "One Observation should be returned",
        );
        assertEquals(
            (bundle.entry[0].resource as Observation).id,
            observation.id,
            "The returned Observation should match the created one",
        );
    });

    if (context.isFilterContainsOperatorSupported()) {
        it("Should find observations with specific code and patient name using _filter", async () => {
            const patientName = uniqueString("Peter");
            const patient = await createTestPatient(context, {
                name: [{ given: [patientName], family: "TestFamily" }],
            });

            const observation = await createTestObservation(
                context,
                patient.id!,
                {
                    code: "1234-5",
                    system: "http://loinc.org",
                    status: "final",
                },
            );

            const filterParam = encodeURIComponent(
                `code eq http://loinc.org|1234-5 and subject.name co "${patientName}"`,
            );
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_filter=${filterParam}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the _filter search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "One Observation should be returned",
            );
            assertEquals(
                (bundle.entry[0].resource as Observation).id,
                observation.id,
                "The returned Observation should match the created one",
            );
        });

        it("Should handle complex _filter queries", async () => {
            const patientName1 = uniqueString("Peter");
            const patientName2 = uniqueString("John");
            const patient1 = await createTestPatient(context, {
                name: [{ given: [patientName1], family: "TestFamily" }],
            });
            const patient2 = await createTestPatient(context, {
                name: [{ given: [patientName2], family: "TestFamily" }],
            });

            await createTestObservation(
                context,
                patient1.id!,
                {
                    code: "1234-5",
                    system: "http://loinc.org",
                    status: "final",
                    value: 100,
                    unit: "mg/dL",
                },
            );

            const observation2 = await createTestObservation(
                context,
                patient2.id!,
                {
                    code: "1234-5",
                    system: "http://loinc.org",
                    status: "final",
                    value: 150,
                    unit: "mg/dL",
                },
            );

            const filterParam = encodeURIComponent(
                `(code eq http://loinc.org|1234-5) and (subject.name co "${patientName1}" or subject.name co "${patientName2}") and (value-quantity gt 120)`,
            );
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_filter=${filterParam}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the complex _filter search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "One Observation should be returned",
            );
            assertEquals(
                (bundle.entry[0].resource as Observation).id,
                observation2.id,
                "The returned Observation should match the one with value > 120 mg/dL",
            );
        });
    }

    it("Should handle _filter with date comparisons", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "ForDateFilter" }],
        });

        const date1 = new Date();
        date1.setDate(date1.getDate() - 1); // yesterday
        const date2 = new Date();
        date2.setDate(date2.getDate() + 1); // tomorrow

        await createTestObservation(context, patient.id!, {
            code: "1234-5",
            system: "http://loinc.org",
            status: "final",
            effectiveDateTime: date1.toISOString().split("T")[0], // Use only the date part
        });

        const observation2 = await createTestObservation(context, patient.id!, {
            code: "1234-5",
            system: "http://loinc.org",
            status: "final",
            effectiveDateTime: date2.toISOString().split("T")[0], // Use only the date part
        });

        const today = new Date().toISOString().split("T")[0]; // Use only the date part
        const filterParam = encodeURIComponent(
            `code eq http://loinc.org|1234-5`,
        );
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_filter=${filterParam}&date=ge${today}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the _filter search with date comparison successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "One Observation should be returned",
        );
        assertEquals(
            (bundle.entry[0].resource as Observation).id,
            observation2.id,
            "The returned Observation should be the one with the future date",
        );
    });
}
