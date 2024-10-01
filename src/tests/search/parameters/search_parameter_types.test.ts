// tests/search/parameters/search_parameter_types.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { assertTrue } from "../../../../deps.test.ts";

export function runSearchParameterTypeTests(context: ITestContext) {
    it("Should support number search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=8480-6&value-quantity=120`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process number search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Observation",
        );
    });

    it("Should support date search parameter", async () => {
        const birthDate = "1990-01-01";
        await createTestPatient(context, { birthDate });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=${birthDate}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process date search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Patients",
        );
    });

    it("Should support string search parameter", async () => {
        const familyName = "TestStringSearch";
        await createTestPatient(context, { family: familyName });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process string search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
    });

    it("Should support token search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, { code: "8480-6" });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=http://loinc.org|8480-6`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process token search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support reference search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {});

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process reference search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support composite search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code-value-quantity=http://loinc.org|8480-6$120`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process composite search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support quantity search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=120||mm[Hg]`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process quantity search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support uri search parameter", async () => {
        // Assuming your server has some resources with a uri parameter
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `StructureDefinition?url=http://hl7.org/fhir/StructureDefinition/Patient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process uri search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching StructureDefinitions",
        );
    });

    // Additional tests for modifiers and prefixes

    it("Should support search parameter modifiers", async () => {
        const familyName = "ModifierTest";
        await createTestPatient(context, { family: familyName });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search parameter with modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
    });

    it("Should support search parameter prefixes", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt100`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search parameter with prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            (bundle.entry?.length ?? 0) > 0,
            "Bundle should contain matching Observations",
        );
    });
}
