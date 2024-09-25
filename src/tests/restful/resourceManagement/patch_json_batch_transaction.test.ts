// tests/patch_json_batch_transaction.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Bundle, Patient, Binary } from "npm:@types/fhir/r4.d.ts";

export function runPatchJsonBatchTransactionTests(context: ITestContext) {
    it("Patch Using JSON Patch in Transaction - Single Resource", async () => {
        const initialPatient = await createTestPatient(context, "TestPatient");
        const patientId = initialPatient.id;

        // Prepare the JSON Patch
        const jsonPatch = [
            { op: "replace", path: "/active", value: !initialPatient.active },
            { op: "add", path: "/telecom/0", value: { system: "phone", value: "555-1234" } },
        ];

        // Encode the JSON Patch as base64
        const encodedPatch = btoa(JSON.stringify(jsonPatch));

        // Prepare the transaction bundle
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: `Patient/${patientId}`,
                    resource: {
                        resourceType: "Binary",
                        contentType: "application/json-patch+json",
                        data: encodedPatch,
                    } as Binary,
                    request: {
                        method: "PATCH",
                        url: `Patient/${patientId}`,
                    },
                },
            ],
        };

        // Submit the transaction
        const transactionResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(transactionResponse.success, true, "Transaction should be successful");
        assertEquals(transactionResponse.status, 200, "Should return 200 OK for successful transaction");

        const responseBundle = transactionResponse.jsonBody as Bundle;
        assertEquals(responseBundle.type, "transaction-response", "Response should be a transaction-response bundle");
        assertEquals(responseBundle.entry?.length, 1, "Response should contain one entry");
        assertEquals(responseBundle.entry?.[0].response?.status, "200 ok", "Patch operation should be successful");

        // Verify the changes
        const verifyResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const updatedPatient = verifyResponse.jsonBody as Patient;
        assertEquals(updatedPatient.active, !initialPatient.active, "Active status should be toggled");
        assertExists(updatedPatient.telecom?.find(t => t.value === "555-1234"), "New phone number should be added");
    });

    it("Patch Using JSON Patch in Batch - Multiple Resources", async () => {
        // Create two test patients
        const patient1 = await createTestPatient(context, "BatchTest1");
        const patient2 = await createTestPatient(context, "BatchTest2");

        // Prepare JSON Patches
        const jsonPatch1 = [{ op: "replace", path: "/active", value: true }];
        const jsonPatch2 = [{ op: "add", path: "/telecom/0", value: { system: "email", value: "test@example.com" } }];

        // Encode the JSON Patches as base64
        const encodedPatch1 = btoa(JSON.stringify(jsonPatch1));
        const encodedPatch2 = btoa(JSON.stringify(jsonPatch2));

        // Prepare the batch bundle
        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    fullUrl: `Patient/${patient1.id}`,
                    resource: {
                        resourceType: "Binary",
                        contentType: "application/json-patch+json",
                        data: encodedPatch1,
                    } as Binary,
                    request: {
                        method: "PATCH",
                        url: `Patient/${patient1.id}`,
                    },
                },
                {
                    fullUrl: `Patient/${patient2.id}`,
                    resource: {
                        resourceType: "Binary",
                        contentType: "application/json-patch+json",
                        data: encodedPatch2,
                    } as Binary,
                    request: {
                        method: "PATCH",
                        url: `Patient/${patient2.id}`,
                    },
                },
            ],
        };

        // Submit the batch
        const batchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(batchBundle),
        });

        assertEquals(batchResponse.success, true, "Batch should be successful");
        assertEquals(batchResponse.status, 200, "Should return 200 OK for successful batch");

        const responseBundle = batchResponse.jsonBody as Bundle;
        assertEquals(responseBundle.type, "batch-response", "Response should be a batch-response bundle");
        assertEquals(responseBundle.entry?.length, 2, "Response should contain two entries");
        assertEquals(responseBundle.entry?.[0].response?.status, "200 ok", "First patch operation should be successful");
        assertEquals(responseBundle.entry?.[1].response?.status, "200 ok", "Second patch operation should be successful");

        // Verify the changes
        const verify1 = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient1.id}`,
        });
        const updatedPatient1 = verify1.jsonBody as Patient;
        assertEquals(updatedPatient1.active, true, "Patient 1 active status should be true");

        const verify2 = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient2.id}`,
        });
        const updatedPatient2 = verify2.jsonBody as Patient;
        assertExists(updatedPatient2.telecom?.find(t => t.value === "test@example.com"), "Patient 2 should have new email");
    });
}

async function createTestPatient(_context: ITestContext, family: string): Promise<Patient> {
    const newPatient: Patient = {
        resourceType: "Patient",
        name: [{ family: family }],
        active: false,
        telecom: [{}]
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Patient",
        method: "POST",
        body: JSON.stringify(newPatient),
    });

    return response.jsonBody as Patient;
}
