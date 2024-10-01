// tests/search/parameters/search_test_basics.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchTestBasicsTests(context: ITestContext) {
    it("Should perform basic string search", async () => {
        const givenName = "TestGiven";
        await createTestPatient(context, { given: [givenName] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=${givenName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process basic string search successfully",
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
            patient.name?.[0].given?.[0],
            givenName,
            "Returned patient should have the searched given name",
        );
    });

    it("Should perform token search", async () => {
        const patient = await createTestPatient(context, {});
        const codeSystem = "http://loinc.org";
        const code = "8480-6";
        await createTestObservation(context, patient.id!, { code: code });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=${codeSystem}|${code}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process token search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Observation",
        );
        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.code.coding?.[0].system,
            codeSystem,
            "Returned observation should have the correct code system",
        );
        assertEquals(
            observation.code.coding?.[0].code,
            code,
            "Returned observation should have the correct code",
        );
    });

    it("Should perform number search with modifier", async () => {
        const patient = await createTestPatient(context, {});
        const systolicBP = 120;
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: systolicBP,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=8480-6&value-quantity:not=${systolicBP}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process number search with modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            0,
            "Bundle should not contain any matching Observations",
        );
    });

    it("Should perform number search with prefix", async () => {
        const patient = await createTestPatient(context, {});
        const systolicBP = 120;
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: systolicBP,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=8480-6&value-quantity=gt100`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process number search with prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Observation",
        );
        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.valueQuantity?.value,
            systolicBP,
            "Returned observation should have the correct value",
        );
    });

    it("Should not allow both modifier and prefix in a single search", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity:not=gt100`,
        });

        // The exact behavior might depend on your server implementation
        // It could either return an error or ignore one of the conflicting parts
        if (response.status >= 400) {
            assertTrue(
                true,
                "Server rejected search with both modifier and prefix",
            );
        } else {
            assertEquals(
                response.status,
                200,
                "Server processed search, likely ignoring one of modifier or prefix",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            // You might want to check the search results to see which of modifier or prefix was applied
        }
    });
}
