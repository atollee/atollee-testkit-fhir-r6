// tests/batch_transaction_response.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    Observation,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";

export function runBatchTransactionResponseTests(_context: ITestContext) {
    it("Batch Response - Successful batch", async () => {
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
                        name: [{ family: "Test", given: ["Batch"] }],
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: "Patient?name=NonExistent",
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

        assertEquals(response.status, 200, "Batch should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check first entry (POST Patient)
        const postResponse = responseBundle.entry?.[0];
        assertEquals(
            postResponse?.response?.status,
            "201 Created",
            "POST should be successful",
        );
        assertExists(
            postResponse?.response?.location,
            "Location should be provided for created resource",
        );
        assertExists(
            postResponse?.response?.etag,
            "ETag should be provided for created resource",
        );

        // Check second entry (GET Patient)
        const getResponse = responseBundle.entry?.[1];
        assertEquals(
            getResponse?.response?.status,
            "200 ok",
            "GET should be successful",
        );
        assertExists(getResponse?.resource, "Search result should be included");
        assertEquals(
            (getResponse?.resource as Bundle).total,
            0,
            "Search should return no results",
        );
    });

    it("Transaction Response - Successful transaction", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Transaction"] }],
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
                            reference:
                                "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
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

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "transaction-response",
            "Response should be a transaction-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check first entry (POST Patient)
        const patientResponse = responseBundle.entry?.[0];
        assertEquals(
            patientResponse?.response?.status,
            "201 Created",
            "Patient POST should be successful",
        );
        assertExists(
            patientResponse?.response?.location,
            "Location should be provided for created Patient",
        );
        assertExists(
            patientResponse?.response?.etag,
            "ETag should be provided for created Patient",
        );

        // Check second entry (POST Observation)
        const observationResponse = responseBundle.entry?.[1];
        assertEquals(
            observationResponse?.response?.status,
            "201 Created",
            "Observation POST should be successful",
        );
        assertExists(
            observationResponse?.response?.location,
            "Location should be provided for created Observation",
        );
        assertExists(
            observationResponse?.response?.etag,
            "ETag should be provided for created Observation",
        );

        // Check that the Observation's subject reference was updated
        const observationResource = observationResponse
            ?.resource as Observation;
        assertExists(
            observationResource.subject?.reference,
            "Observation should have a subject reference",
        );
        assertNotEquals(
            observationResource.subject?.reference,
            "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
            "UUID reference should be replaced",
        );
        assertEquals(
            observationResource.subject?.reference.indexOf("/Patient/") !== -1,
            true,
            "Observation subject should reference the created Patient",
        );
    });

    it("Transaction Response - Failed transaction", async () => {
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
                        name: [{ family: "Test", given: ["Transaction"] }],
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
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 400, "Transaction should fail");
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertEquals(
            operationOutcome.resourceType,
            "OperationOutcome",
            "Response should be an OperationOutcome",
        );
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should have issues",
        );
    });

    it("Batch Response - With Prefer header", async () => {
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
                        name: [{ family: "Test", given: ["Prefer"] }],
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            headers: {
                "Prefer": "return=representation",
            },
            body: JSON.stringify(batchBundle),
        });

        assertEquals(response.status, 200, "Batch should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            1,
            "Response should have 1 entry",
        );

        const postResponse = responseBundle.entry?.[0];
        assertEquals(
            postResponse?.response?.status,
            "201 Created",
            "POST should be successful",
        );
        assertExists(
            postResponse?.resource,
            "Created resource should be included in the response",
        );
        assertEquals(
            (postResponse?.resource as Patient).resourceType,
            "Patient",
            "Included resource should be a Patient",
        );
    });
}
