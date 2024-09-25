// tests/batch_transaction.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    Observation,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";

export function runBatchTransactionTests(context: ITestContext) {
    it("Batch - Multiple actions", async () => {
        const familyName = `Doe${Date.now()}`;
        for (let i = 0; i < 2; i++) {
            const patient = await createTestPatient(context, familyName);
            assertTrue(patient, "test patient was created successfully");
        }
        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: `${familyName}`, given: ["John"] }],
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: `Patient?name=${familyName}`,
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(batchBundle),
        });

        assertEquals(response.success, true, "Batch request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.type, "batch-response", "Response should be a batch-response bundle");
        assertEquals(responseBundle.entry?.length, 2, "Response should have 3 entries");
        assertEquals(responseBundle.entry?.[0].response?.status, "201 Created", "First entry should be created");
        assertEquals(responseBundle.entry?.[1].response?.status, "200 ok", "Second entry should be successful");
    });

    it("Transaction - Atomic operations", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: "urn:uuid:patient-1", // Add this line
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Doe", given: ["Jane"] }],
                    },
                },
                {
                    request: {
                        method: "POST",
                        url: "Observation",
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "55284-4",
                            }],
                        },
                        subject: {
                            reference: "urn:uuid:patient-1",
                        },
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(
            response.success,
            true,
            "Transaction request should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "transaction-response",
            "Response should be a transaction-response bundle",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );
        assertEquals(
            responseBundle.entry?.[0].response?.status,
            "201 Created",
            "Patient should be created",
        );
        assertEquals(
            responseBundle.entry?.[1].response?.status,
            "201 Created",
            "Observation should be created",
        );

        // Check if the Observation's subject reference was updated
        const observationEntry = responseBundle.entry?.[1];
        const observationResource = observationEntry?.resource as Observation;
        assertExists(
            observationResource.subject?.reference,
            "Observation should have a subject reference",
        );
        assertEquals(
            observationResource.subject?.reference.indexOf("/Patient/") !== -1,
            true,
            "Observation's subject should reference the created Patient",
        );
    });

    it("Batch - Mixed success and failure", async () => {
        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Doe", given: ["Alice"] }],
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: "NonExistentResource/12345",
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(batchBundle),
        });

        assertEquals(response.success, true, "Batch request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.type, "batch-response", "Response should be a batch-response bundle");
        assertEquals(responseBundle.entry?.length, 2, "Response should have 2 entries");
        assertEquals(responseBundle.entry?.[0].response?.status, "201 Created", "Patient should be created");
        assertEquals(responseBundle.entry?.[1].response?.status, "404 Not Found", "NonExistentResource should not be found");
    });

    it("Transaction - Failure rolls back all operations", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Doe", given: ["Bob"] }],
                    },
                },
                {
                    request: {
                        method: "PUT",
                        url: `PatientBB/non-existent-id-${Date.now()}`,
                    },
                    resource: {
                        // deno-lint-ignore no-explicit-any
                        resourceType: "PatientBB" as any,
                        id: "non-existent-id",
                        name: [{ family: "Smith", given: ["Alice"] }],
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.success, false, "Transaction request should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "Response should include an OperationOutcome with issues");
    });

    it("Batch - Unsupported operation", async () => {
        // deno-lint-ignore no-explicit-any
        const batchBundle: any = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "UNSUPPORTED",
                        url: "Patient",
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(batchBundle),
        });

        assertEquals(response.success, false, "Batch with unsupported operation should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(operationOutcome.issue, "Response should include an OperationOutcome with issues");
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
