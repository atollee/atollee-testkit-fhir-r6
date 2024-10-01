// tests/search/parameters/modifiers.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runModifiersTests(context: ITestContext) {
    it("Should support modifiers on search parameters", async () => {
        const uniqueName = uniqueString("TestPatient");
        await createTestPatient(context, { name: [{ family: uniqueName }] });
        await createTestPatient(context, {}); // Patient without a name

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name:missing=false`,
        });

        assertEquals(response.status, 200, "Server should process search with modifier successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one matching Patient");
        const patient = bundle.entry[0].resource as Patient;
        assertEquals(patient.name?.[0].family, uniqueName, "Returned patient should have the correct name");
    });

    it("Should reject search with unsupported modifier", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name:unsupported=TestName`,
        });

        assertEquals(response.status, 400, "Server should reject search with unsupported modifier");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
        assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
    });

    it("Should allow only a single modifier per search parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name:exact:contains=TestName`,
        });

        assertEquals(response.status, 400, "Server should reject search with multiple modifiers");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
        assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
    });

    it("Should apply modifier to all values in OR-joined search", async () => {
        const uniqueNameA = uniqueString("TestPatientA");
        const uniqueNameB = uniqueString("TestPatientB");
        await createTestPatient(context, { name: [{ given: [uniqueNameA] }] });
        await createTestPatient(context, { name: [{ given: [uniqueNameB] }] });
        await createTestPatient(context, { name: [{ given: [uniqueNameA.toLowerCase()] }] });
        await createTestPatient(context, { name: [{ given: [uniqueNameB.toLowerCase()] }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?given:exact=${uniqueNameA},${uniqueNameB}`,
        });

        assertEquals(response.status, 200, "Server should process search with modifier on OR-joined values successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 2, "Bundle should contain two matching Patients");
        bundle.entry.forEach(entry => {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.name?.[0].given?.includes(uniqueNameA) || patient.name?.[0].given?.includes(uniqueNameB),
                "Returned patients should have exact matches for either name"
            );
        });
    });
}