// tests/search/transport_protocols/batched_search.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runBatchedSearchTests(context: ITestContext) {
    it("Should support batching multiple search requests", async () => {
        // Create two test patients
        const patient1 = await createTestPatient(context, {
            family: "BatchTest1",
        });
        const patient2 = await createTestPatient(context, {
            family: "BatchTest2",
        });

        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "GET",
                        url: "Patient?family=BatchTest1",
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: "Patient?family=BatchTest2",
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
            "Server should process batch request successfully",
        );

        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response bundle",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should contain two entries",
        );

        // Check first search result
        const firstSearchBundle = responseBundle.entry?.[0].resource as Bundle;
        assertEquals(
            firstSearchBundle.type,
            "searchset",
            "First entry should be a searchset bundle",
        );
        const firstPatient = firstSearchBundle.entry?.[0].resource as Patient;
        assertEquals(
            firstPatient.id,
            patient1.id,
            "First search should return the first test patient",
        );

        // Check second search result
        const secondSearchBundle = responseBundle.entry?.[1].resource as Bundle;
        assertEquals(
            secondSearchBundle.type,
            "searchset",
            "Second entry should be a searchset bundle",
        );
        const secondPatient = secondSearchBundle.entry?.[0].resource as Patient;
        assertEquals(
            secondPatient.id,
            patient2.id,
            "Second search should return the second test patient",
        );
    });

    it("Should accept GET-based searches in a batch, even if not typically supported", async () => {
        // This test assumes that the server might not typically support GET-based searches
        // Create a test patient
        const patient = await createTestPatient(context, {
            family: "BatchGetTest",
        });

        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "GET",
                        url: "Patient?family=BatchGetTest",
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
            "Server should process batch request with GET-based search successfully",
        );

        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response bundle",
        );
        assertEquals(
            responseBundle.entry?.length,
            1,
            "Response should contain one entry",
        );

        const searchBundle = responseBundle.entry?.[0].resource as Bundle;
        assertEquals(
            searchBundle.type,
            "searchset",
            "Entry should be a searchset bundle",
        );
        const returnedPatient = searchBundle.entry?.[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Search should return the test patient",
        );
    });

    it("Should not impose GET-specific limitations on searches within a batch", async () => {
        // This test checks if the server imposes any GET-specific limitations
        // We'll use a search with a potentially long parameter that might be rejected in a normal GET request
        const longFamilyName = "A".repeat(1000); // Create a very long family name
        const patient = await createTestPatient(context, {
            family: longFamilyName,
        });

        const batchBundle: Bundle = {
            resourceType: "Bundle",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "GET",
                        url: `Patient?family=${longFamilyName}`,
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
            "Server should process batch request with long parameter successfully",
        );

        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response bundle",
        );
        assertEquals(
            responseBundle.entry?.length,
            1,
            "Response should contain one entry",
        );

        const searchBundle = responseBundle.entry?.[0].resource as Bundle;
        assertEquals(
            searchBundle.type,
            "searchset",
            "Entry should be a searchset bundle",
        );
        const returnedPatient = searchBundle.entry?.[0].resource as Patient;
        assertEquals(
            returnedPatient.id,
            patient.id,
            "Search should return the test patient despite long parameter",
        );
    });
}
