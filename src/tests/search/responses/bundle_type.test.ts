// tests/search/responses/bundle_type.test.ts

import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runBundleTypeTests(context: ITestContext) {
    it("Search result bundle should have type 'searchset'", async () => {
        // Create a test patient to ensure we have at least one search result
        await createTestPatient(context, { family: "BundleTypeTest" });

        // Perform a search
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=BundleTypeTest",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Bundle type should be 'searchset'",
        );
    });

    it("Empty search result should still return a bundle with type 'searchset'", async () => {
        // Perform a search that's unlikely to return results
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?family=NonexistentFamilyName12345",
        });

        assertEquals(
            response.success,
            true,
            "Search request should be successful even with no results",
        );

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Bundle type should be 'searchset' even for empty results",
        );
        assertEquals(bundle.total, 0, "Total should be 0 for empty results");
    });

    if (context.isMultiTypeSearchSupported()) {
        it("Search across multiple resource types should return a bundle with type 'searchset'", async () => {
            // Create a unique family name and birth date for the test patient
            const uniqueFamilyName = "MultiTypeSearchTest" + Date.now();
            const uniqueBirthDate = "1990-01-01";

            // Create a test patient with the unique family name and birth date
            const patient = await createTestPatient(context, {
                family: uniqueFamilyName,
                birthDate: uniqueBirthDate,
            });

            // Create a test observation for this patient
            const uniqueObservationCode = "multi-type-search-test-" +
                Date.now();
            await createTestObservation(context, patient.id!, {
                code: uniqueObservationCode,
                system: "http://example.com/test-codes",
            });

            // Perform a search across multiple resource types
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: "_search",
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body:
                    `_type=Patient,Observation&family=${uniqueFamilyName}&birthdate=${uniqueBirthDate}&code=${uniqueObservationCode}`,
            });

            assertEquals(
                response.success,
                true,
                "Multi-type search request should be successful",
            );

            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.type,
                "searchset",
                "Bundle type should be 'searchset' for multi-type search",
            );

            assertTrue(
                bundle.entry && bundle.entry.length >= 2,
                "Should have at least two entries for multi-type search",
            );

            // Check that we have both a Patient and an Observation in the results
            const hasPatient = bundle.entry?.some((entry) =>
                entry.resource?.resourceType === "Patient"
            );
            const hasObservation = bundle.entry?.some((entry) =>
                entry.resource?.resourceType === "Observation"
            );

            assertTrue(hasPatient, "Search results should include a Patient");
            assertTrue(
                hasObservation,
                "Search results should include an Observation",
            );

            // Verify the Patient in the results
            const patientEntry = bundle.entry?.find((entry) =>
                entry.resource?.resourceType === "Patient"
            );
            const patientResource = patientEntry?.resource as Patient;
            assertEquals(
                patientResource?.name?.[0]?.family,
                uniqueFamilyName,
                "The Patient in the results should have the correct family name",
            );
            assertEquals(
                patientResource?.birthDate,
                uniqueBirthDate,
                "The Patient in the results should have the correct birth date",
            );

            // Verify the Observation in the results
            const observationEntry = bundle.entry?.find((entry) =>
                entry.resource?.resourceType === "Observation"
            );
            assertEquals(
                (observationEntry?.resource as Observation)?.code?.coding?.[0]
                    ?.code,
                uniqueObservationCode,
                "The Observation in the results should have the correct code",
            );
        });
    }
}
