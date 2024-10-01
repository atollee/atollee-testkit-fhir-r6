// tests/search/parameters/above_modifier_token.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../../deps.test.ts";
import { fetchWrapper } from "../../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

const SNOMED_SYSTEM = "http://snomed.info/sct";

export function runAboveModifierTokenTests(context: ITestContext) {
    it("Should find observations with codes above the specified SNOMED CT code", async () => {
        const patient = await createTestPatient(context, {});

        // Create observations with different SNOMED CT codes
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "3738000",
            display: "Viral hepatitis",
        });
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "235862008",
            display: "Hepatitis due to infection",
        });
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "128241005",
            display: "Inflammatory disease of liver",
        });
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "312130009",
            display: "Viral infection by site",
        });
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "301810000",
            display: "Infection by site",
        });
        // Create an observation with an unrelated code
        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "386661006",
            display: "Fever",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code:above=${SNOMED_SYSTEM}|3738000`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with above modifier on token successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            5,
            "Bundle should contain five matching Observations",
        );

        const codes = bundle.entry.map((entry) =>
            (entry.resource as Observation).code.coding?.[0].code
        );
        assertTrue(
            codes.includes("3738000"),
            "Results should include the exact code",
        );
        assertTrue(
            codes.includes("235862008"),
            "Results should include parent code 'Hepatitis due to infection'",
        );
        assertTrue(
            codes.includes("128241005"),
            "Results should include grandparent code 'Inflammatory disease of liver'",
        );
        assertTrue(
            codes.includes("312130009"),
            "Results should include parent code 'Viral infection by site'",
        );
        assertTrue(
            codes.includes("301810000"),
            "Results should include grandparent code 'Infection by site'",
        );
        assertFalse(
            codes.includes("386661006"),
            "Results should not include unrelated code 'Fever'",
        );
    });

    it("Should handle token search without system", async () => {
        const patient = await createTestPatient(context, {});

        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "3738000",
            display: "Viral hepatitis",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code:above=3738000`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with above modifier on token without system",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Observation",
        );
    });

    it("Should handle token search with only system", async () => {
        const patient = await createTestPatient(context, {});

        await createTestObservation(context, patient.id!, {
            system: SNOMED_SYSTEM,
            code: "3738000",
            display: "Viral hepatitis",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code:above=${SNOMED_SYSTEM}|`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with above modifier on token with only system",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Observation",
        );
    });
}
