// tests/advanced_search.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertNotEquals, it } from "../../../../deps.test.ts";
import { Bundle, Patient, Observation } from "npm:@types/fhir/r4.d.ts";

export function runAdvancedSearchTests(_context: ITestContext) {
    it("Search - Chained parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation?subject:Patient.name=John",
        });

        assertEquals(response.success, true, "Chained parameter search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Observation"), true, "All entries should be Observation resources");
    });

    it("Search - Reverse chained parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_has:Observation:subject:code=http://loinc.org|55284-4",
        });

        assertEquals(response.success, true, "Reverse chained parameter search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Patient"), true, "All entries should be Patient resources");
    });

    it("Search - Composite parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation?component-code-value-quantity=http://loinc.org|8480-6$gt100",
        });

        assertEquals(response.success, true, "Composite parameter search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Observation"), true, "All entries should be Observation resources");
    });

    it("Search - Token search on system", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?identifier=http://example.org/fhir/ids|",
        });

        assertEquals(response.success, true, "Token search on system should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Patient"), true, "All entries should be Patient resources");
    });

    it("Search - Date range", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?birthdate=ge2000-01-01&birthdate=le2010-12-31",
        });

        assertEquals(response.success, true, "Date range search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.every(e => e.resource?.resourceType === "Patient"), true, "All entries should be Patient resources");
    });

    it("Search - _include parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "MedicationRequest?_include=MedicationRequest:patient",
        });

        assertEquals(response.success, true, "_include search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry?.find(e => e.resource?.resourceType === "MedicationRequest"), "Should include MedicationRequest resources");
        assertExists(bundle.entry?.find(e => e.resource?.resourceType === "Patient"), "Should include Patient resources");
    });

    it("Search - _revinclude parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_revinclude=Observation:subject",
        });

        assertEquals(response.success, true, "_revinclude search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry?.find(e => e.resource?.resourceType === "Patient"), "Should include Patient resources");
        assertExists(bundle.entry?.find(e => e.resource?.resourceType === "Observation"), "Should include Observation resources");
    });

    it("Search - _summary parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_summary=true",
        });

        assertEquals(response.success, true, "_summary search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const patient = bundle.entry?.[0].resource as Patient;
        assertExists(patient.id, "Summary should include id");
        assertExists(patient.meta, "Summary should include meta");
        assertEquals(Object.keys(patient).length < 10, true, "Summary should include limited fields");
    });

    it("Search - _elements parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_elements=id,name",
        });

        assertEquals(response.success, true, "_elements search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const patient = bundle.entry?.[0].resource as Patient;
        assertExists(patient.id, "Should include id");
        assertExists(patient.name, "Should include name");
        assertEquals(Object.keys(patient).length, 3, "Should only include specified elements plus resourceType");
    });

    it("Search - _count parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=5",
        });

        assertEquals(response.success, true, "_count search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.length ?? 0 <= 5, true, "Should return no more than 5 entries");
    });

    it("Search - _sort parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_sort=birthdate",
        });

        assertEquals(response.success, true, "_sort search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const patients = bundle.entry?.map(e => e.resource as Patient) ?? [];
        for (let i = 1; i < patients.length; i++) {
            assertNotEquals(new Date(patients[i-1].birthDate!) > new Date(patients[i].birthDate!), true, "Patients should be sorted by birthdate");
        }
    });

    it("Search - _total parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_total=accurate",
        });

        assertEquals(response.success, true, "_total search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Should include total count");
        assertEquals(typeof bundle.total, "number", "Total should be a number");
    });

    it("Search - _containedType parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Observation?_containedType=both",
        });

        assertEquals(response.success, true, "_containedType search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const observation = bundle.entry?.[0].resource as Observation;
        assertExists(observation.contained, "Should include contained resources");
    });
}