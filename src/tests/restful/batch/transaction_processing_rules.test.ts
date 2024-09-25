// tests/transaction_processing_rules.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";

export function runTransactionProcessingRulesTests(_context: ITestContext) {
    it("Transaction - All or nothing processing", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Transaction"] }]
                    }
                },
                {
                    request: {
                        method: "GET",
                        url: `Patient/non-existent-id-${Date.now()}`
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });
        assertEquals(response.status, 400, "Transaction should fail due to non-existent resource");
    });

    it("Transaction - Processing order", async () => {
        const initialPatientId = "test-patient-" + Date.now();
        const newPatientUuid = crypto.randomUUID();
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "DELETE",
                        url: `Patient/${initialPatientId}`
                    }
                },
                {
                    fullUrl: `urn:uuid:${newPatientUuid}`,
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Order"] }]
                    }
                },
                {
                    request: {
                        method: "PUT",
                        url: `Patient/${newPatientUuid}`
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Updated"] }]
                    }
                },
                {
                    request: {
                        method: "GET",
                        url: `Patient/${newPatientUuid}`
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.entry?.length, 4, "Response should have 4 entries");
        assertEquals(responseBundle.entry?.[0].response?.status, "204 No Content", "DELETE operation should be successful");
        assertEquals(responseBundle.entry?.[1].response?.status, "201 Created", "POST operation should be successful");
        assertEquals(responseBundle.entry?.[2].response?.status, "200 ok", "PUT operation should be successful");
        assertEquals(responseBundle.entry?.[3].response?.status, "200 ok", "GET operation should be successful");
    });

    it("Transaction - Resolving references", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Reference"] }]
                    }
                },
                {
                    request: {
                        method: "POST",
                        url: "Observation"
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{ system: "http://loinc.org", code: "55284-4" }]
                        },
                        subject: {
                            reference: "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a"
                        }
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.entry?.length, 2, "Response should have 2 entries");
        assertEquals(responseBundle.entry?.[0].response?.status, "201 Created", "Patient creation should be successful");
        assertEquals(responseBundle.entry?.[1].response?.status, "201 Created", "Observation creation should be successful");

        const patientLocation = responseBundle.entry?.[0].response?.location;
        const observationResource = responseBundle.entry?.[1].resource as Observation;
        assertExists(patientLocation, "Patient location should be provided");
        assertExists(observationResource.subject?.reference, "Observation should have a subject reference");
        assertEquals(observationResource.subject?.reference, patientLocation, "Observation subject should reference the created Patient");
    });

    it("Transaction - Conditional create", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                        ifNoneExist: "identifier=urn:oid:1.2.36.146.595.217.0.1|12345"
                    },
                    resource: {
                        resourceType: "Patient",
                        identifier: [{
                            system: "urn:oid:1.2.36.146.595.217.0.1",
                            value: "12345"
                        }],
                        name: [{ family: "Test", given: ["Conditional"] }]
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.entry?.length, 1, "Response should have 1 entry");
        assertEquals(responseBundle.entry?.[0].response?.status, "201 Created", "Conditional create should be successful");
    });
}
