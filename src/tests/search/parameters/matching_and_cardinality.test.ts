// tests/search/parameters/matching_and_cardinality.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runMatchingAndCardinalityTests(context: ITestContext) {
    it("Should match patient with multiple names when searching for one name", async () => {
        const patient = await createTestPatient(context, {
            family: "TestFamily",
            given: ["FirstName", "MiddleName"],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=FirstName`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });

    it("Should match patient when searching for second given name", async () => {
        const patient = await createTestPatient(context, {
            family: "TestFamily",
            given: ["FirstName", "MiddleName"],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=MiddleName`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });

    it("Should match patient with multiple addresses when searching for one address", async () => {
        const patient = await createTestPatient(context, {
            address: [
                { city: "New York" },
                { city: "Los Angeles" },
            ],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?address-city=New York`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });

    it("Should match patient when searching for second address", async () => {
        const patient = await createTestPatient(context, {
            address: [
                { city: "New York" },
                { city: "Los Angeles" },
            ],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?address-city=Los Angeles`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });

    it("Should match patient with multiple identifiers when searching for one identifier", async () => {
        const patient = await createTestPatient(context, {
            identifier: [
                { system: "http://example.com/id/mrn", value: "12345" },
                { system: "http://example.com/id/ssn", value: "987-65-4321" },
            ],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=http://example.com/id/mrn|12345`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });

    it("Should match patient when searching for second identifier", async () => {
        const patient = await createTestPatient(context, {
            identifier: [
                { system: "http://example.com/id/mrn", value: "12345" },
                { system: "http://example.com/id/ssn", value: "987-65-4321" },
            ],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier=http://example.com/id/ssn|987-65-4321`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
        const returnedPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Returned patient should match the created patient",
        );
    });
}
