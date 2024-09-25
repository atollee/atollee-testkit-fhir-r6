// tests/create-update-patch-transaction.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertTrue, assertFalse, it } from "../../../../deps.test.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";

export function runCreateUpdatePatchTransactionTests(_context: ITestContext) {
    const newPatient = {
        resourceType: "Patient",
        name: [{ family: "Test", given: ["Create"] }]
    };

    it("Create - Prefer return=minimal", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(newPatient)
        });

        assertEquals(response.status, 201, "Should return 201 Created");
        assertTrue(!response.jsonBody, "Response should not include a body");
        assertExists(response.headers.get("Location"), "Response should include a Location header");
    });

    it("Create - Prefer return=representation", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Prefer": "return=representation"
            },
            body: JSON.stringify(newPatient)
        });

        assertEquals(response.status, 201, "Should return 201 Created");
        assertExists(response.jsonBody, "Response should include the created resource");
        assertEquals(response.jsonBody.resourceType, "Patient", "Returned resource should be a Patient");
        assertExists(response.jsonBody.id, "Returned resource should have an ID");
    });

    it("Create - Prefer return=OperationOutcome", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "Prefer": "return=OperationOutcome"
            },
            body: JSON.stringify(newPatient)
        });

        assertEquals(response.status, 201, "Should return 201 Created");
        assertExists(response.jsonBody, "Response should include an OperationOutcome");
        assertEquals(response.jsonBody.resourceType, "OperationOutcome", "Returned resource should be an OperationOutcome");
    });

    it("Update - Prefer return=minimal", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient)
        });

        const patient = createResponse.jsonBody as Patient;
        const patientId = patient?.id;

        // Now, update the patient
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            headers: {
                "Prefer": "return=minimal"
            },
            body: JSON.stringify({ ...patient, active: true })
        });
        assertEquals(updateResponse.status, 200, "Should return 200 OK");
        assertTrue(!updateResponse.jsonBody, "Response should not include a body");
    });

    it("Patch - Prefer return=representation", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient)
        });

        const patient = createResponse.jsonBody as Patient;
        const patientId = patient?.id;

        // Now, patch the patient
        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PATCH",
            headers: {
                "Prefer": "return=representation",
                "Content-Type": "application/json-patch+json"
            },
            body: JSON.stringify([
                { op: "add", path: "/active", value: true }
            ])
        });

        assertEquals(patchResponse.status, 200, "Should return 200 OK");
        assertExists(patchResponse.jsonBody, "Response should include the updated resource");
        const responsePatient = patchResponse.jsonBody as Patient;
        assertEquals(responsePatient.active, true, "Patient should be updated with the patched value");
    });

    it("Transaction - Prefer return=minimal", async () => {
        const transaction = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: newPatient
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            headers: {
                "Prefer": "return=minimal"
            },
            body: JSON.stringify(transaction)
        });

        const bundle = response.jsonBody as Bundle;
        assertEquals(response.status, 200, "Should return 200 OK");
        assertEquals(response.headers.get("Prefer"), "return=minimal", "Response should acknowledge the Prefer header");
        assertExists(response.jsonBody, "Response should include a Bundle");
        assertEquals(response.jsonBody.resourceType, "Bundle", "Returned resource should be a Bundle");
        assertEquals(bundle.type, "transaction-response", "Bundle should be a transaction-response");

        assertExists(bundle.entry, "Bundle should have entries");
        assertEquals(bundle.entry.length, 1, "Bundle should have one entry");

        const entry = bundle.entry[0];
        assertExists(entry.response, "Entry should include a response");
        assertEquals(entry.response.status, "201 Created", "Entry response should indicate successful creation");
        assertExists(entry.response.location, "Entry response should include a location");
        assertFalse('resource' in entry, "Entry should not include a resource");
    });
}
