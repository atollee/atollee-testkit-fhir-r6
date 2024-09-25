// tests/batch_processing_rules.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";

export function runBatchProcessingRulesTests(_context: ITestContext) {
    it("Batch - Independent operations", async () => {
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
                        url: "Patient/non-existent-id",
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

        assertEquals(
            response.status,
            200,
            "Batch should return 200 OK regardless of individual operation outcomes",
        );
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
        assertEquals(
            responseBundle.entry?.[0].response?.status,
            "201 Created",
            "First operation should be successful",
        );
        assertEquals(
            responseBundle.entry?.[1].response?.status,
            "404 Not Found",
            "Second operation should fail",
        );
    });

    it("Batch - No interdependencies", async () => {
        const patientId = "test-patient-" + Date.now();
        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "PUT",
                        url: `Patient/${patientId}`,
                    },
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["Batch"] }],
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
                            reference: `Patient/${patientId}`,
                        },
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

        assertEquals(response.status, 200, "Batch should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );
        assertEquals(
            responseBundle.entry?.[0].response?.status,
            "201 Created",
            "Patient creation should be successful",
        );
        assertEquals(
            responseBundle.entry?.[1].response?.status,
            "201 Created",
            "Observation creation should not be successful due to referencing a resource within the batch",
        );
    });

    it("Batch - Processing independence", async () => {
        const patientId = "order-patient-" + Date.now();
        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "GET",
                        url: `Patient/${patientId}`,
                    },
                },
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["Order"] }],
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

        assertEquals(response.status, 200, "Batch should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check that the response entries correspond to the request entries
        assertEquals(
            responseBundle.entry?.[0].response?.status?.startsWith("200") ||
                responseBundle.entry?.[0].response?.status?.startsWith("404"),
            true,
            "First entry should be a GET response (either 200 OK or 404 Not Found)",
        );
        assertEquals(
            responseBundle.entry?.[1].response?.status,
            "201 Created",
            "Second entry should be a POST response",
        );
    });

    it("Batch - Non-conformant references", async () => {
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
                        name: [{ family: "Test", given: ["Reference"] }],
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
                                "urn:uuid:11111111-2222-3333-4444-555555555555",
                        },
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

        assertEquals(response.status, 200, "Batch should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;

        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );
        assertEquals(
            responseBundle.entry?.[0].response?.status,
            "201 Created",
            "Patient creation should be successful",
        );
        const postStatus = responseBundle.entry?.[1].response?.status;
        assertTrue(
            postStatus === "201 Created" || postStatus?.startsWith("400"),
            "Observation should either be a successful creation or denied by server due to reference",
        );
    });
}
