// tests/search/parameters/resource_specific_parameters.test.ts

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

export function runResourceSpecificParameterTests(context: ITestContext) {
    it("Should search patients by name", async () => {
        const uniqueName = uniqueString("TestPatient");
        await createTestPatient(context, {
            name: [{ given: [uniqueName], family: "Doe" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process name parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).name?.[0].given?.[0],
            uniqueName,
            "Returned Patient should have the correct name",
        );
    });

    it("Should search patients by birthdate", async () => {
        const birthDate = "1990-01-01";
        await createTestPatient(context, { birthDate: birthDate });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=${birthDate}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process birthdate parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).birthDate,
            birthDate,
            "Returned Patient should have the correct birthdate",
        );
    });

    // Add more Patient-specific search parameter tests here

    it("Should search observations by code", async () => {
        const uniqueCode = uniqueString("TestCode");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: uniqueCode,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=${uniqueCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process code parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertEquals(
            (bundle.entry[0].resource as Observation).code?.coding?.[0]
                .code,
            uniqueCode,
            "Returned Observation should have the correct code",
        );
    });

    it("Should search observations by date", async () => {
        const observationDate = new Date().toISOString().split("T")[0];
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            effectiveDateTime: observationDate,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?date=${observationDate}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process date parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            (bundle.entry[0].resource as Observation).effectiveDateTime
                ?.startsWith(observationDate),
            "Returned Observation should have the correct date",
        );
    });

    // Add more Observation-specific search parameter tests here

    it("Should support _id parameter for all resource types", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _id parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain exactly one entry",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Returned Patient should have the correct id",
        );
    });

    it("Should handle multiple paths for a single search parameter", async () => {
        const uniqueIdentifier = uniqueString("TestIdentifier");
        await createTestPatient(context, {
            identifier: [
                { system: "http://example.com/mrn", value: uniqueIdentifier },
                { system: "http://example.com/ssn", value: uniqueIdentifier },
            ],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process identifier parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            (bundle.entry[0].resource as Patient).identifier?.some((id) =>
                id.value === uniqueIdentifier
            ),
            "Returned Patient should have the correct identifier",
        );
    });

    // You can add more general tests here that apply to multiple resource types
}
