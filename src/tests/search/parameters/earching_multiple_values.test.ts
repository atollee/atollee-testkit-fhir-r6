// tests/search/parameters/searching_multiple_values.test.ts

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
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runSearchingMultipleValuesTests(context: ITestContext) {
    it("Should perform AND join for multiple search parameters", async () => {
        const uniqueFamily = uniqueString("TestFamily");
        const uniqueGiven = uniqueString("TestGiven");

        await createTestPatient(context, {
            family: uniqueFamily,
            given: [uniqueGiven],
        });
        await createTestPatient(context, {
            family: uniqueFamily,
            given: [uniqueString("OtherGiven")],
        });
        await createTestPatient(context, {
            family: uniqueString("OtherFamily"),
            given: [uniqueGiven],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=${uniqueGiven}&family=${uniqueFamily}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process AND join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const patient = bundle.entry[0].resource as Patient;
        assertEquals(
            patient.name?.[0].family,
            uniqueFamily,
            "Returned patient should have the correct family name",
        );
        assertEquals(
            patient.name?.[0].given?.[0],
            uniqueGiven,
            "Returned patient should have the correct given name",
        );
    });

    it("Should perform AND join for repeated search parameters", async () => {
        const uniqueGivenA = uniqueString("GivenA");
        const uniqueGivenB = uniqueString("GivenB");

        await createTestPatient(context, {
            given: [uniqueGivenA, uniqueGivenB],
        });
        await createTestPatient(context, {
            given: [uniqueGivenA, uniqueString("OtherGiven")],
        });
        await createTestPatient(context, {
            given: [uniqueString("OtherGiven"), uniqueGivenB],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=${uniqueGivenA}&given=${uniqueGivenB}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process repeated AND join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const patient = bundle.entry[0].resource as Patient;
        assertTrue(
            patient.name?.[0].given?.includes(uniqueGivenA),
            "Returned patient should have GivenA",
        );
        assertTrue(
            patient.name?.[0].given?.includes(uniqueGivenB),
            "Returned patient should have GivenB",
        );
    });

    it("Should perform OR join for comma-separated values", async () => {
        const uniqueGivenA = uniqueString("GivenA");
        const uniqueGivenB = uniqueString("GivenB");

        await createTestPatient(context, { given: [uniqueGivenA] });
        await createTestPatient(context, { given: [uniqueGivenB] });
        await createTestPatient(context, {
            given: [uniqueString("OtherGiven")],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=${uniqueGivenA},${uniqueGivenB}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process OR join search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two matching Patients",
        );
        bundle.entry.forEach((entry) => {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.name?.[0].given?.includes(uniqueGivenA) ||
                    patient.name?.[0].given?.includes(uniqueGivenB),
                "Returned patient should have either GivenA or GivenB",
            );
        });
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should support prefixes in OR joined values", async () => {
            const uniqueCode = uniqueString("8867-4");
            const patient = await createTestPatient(context, {});
            await createTestObservation(context, patient.id!, {
                code: uniqueCode,
                value: 50,
            });
            await createTestObservation(context, patient.id!, {
                code: uniqueCode,
                value: 110,
            });
            await createTestObservation(context, patient.id!, {
                code: uniqueCode,
                value: 80,
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?code=${uniqueCode}&value-quantity=lt60,gt100`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process OR join search with prefixes successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Bundle should contain two matching Observations",
            );
            bundle.entry.forEach((entry) => {
                const observation = entry.resource as Observation;
                assertTrue(
                    (observation.valueQuantity?.value ?? 0) < 60 ||
                        (observation.valueQuantity?.value ?? 0) > 100,
                    "Returned observation should have value less than 60 or greater than 100",
                );
            });
        });
    }
}
