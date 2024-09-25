// tests/search_method_choice.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {assertEquals, assertExists, assertTrue, it} from "../../../../deps.test.ts";
import { Bundle, OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";

export function runSearchMethodChoiceTests(context: ITestContext) {
    it("Search - GET and POST methods both supported", async () => {
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        const postResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(getResponse.success, true, "GET search should be successful");
        assertEquals(postResponse.success, true, "POST search should be successful");
        assertEquals(getResponse.status, 200, "GET should return 200 OK");
        assertEquals(postResponse.status, 200, "POST should return 200 OK");
    });

    it("Search - Handling large result sets", async () => {
        for (let i = 0; i < 30; ++i) {
            const response = await createTestPatient(context, 'LargeTest');
            assertTrue(response, "patient was successfully created");
        }
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=1000",  // Request a large number of results
        });

        assertEquals(response.success, true, "Large result set search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.link?.find(link => link.relation === "next"), "Should have a next link for pagination");
    });

    it("Search - OperationOutcome in searchset", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        assertEquals(response.success, true, "Search should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        const operationOutcome = bundle.entry?.find(entry => entry.resource?.resourceType === "OperationOutcome");
        if (operationOutcome) {
            assertEquals(operationOutcome.search?.mode, "outcome", "OperationOutcome should have search mode 'outcome'");
            const issues = (operationOutcome.resource as OperationOutcome).issue || [];
            assertEquals(issues.every(issue => issue.severity !== "error" && issue.severity !== "fatal"), true, "OperationOutcome should not contain error or fatal issues");
        }
    });

    it("Search - Failure with 4xx status code", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?invalid_param=value",
        });

        assertEquals(response.success, false, "Search with invalid parameter should fail");
        assertEquals(response.status >= 400 && response.status < 500, true, "Should return a 4xx status code");
        assertExists(response.jsonBody, "Should return an OperationOutcome");
        assertEquals(response.jsonBody.resourceType, "OperationOutcome", "Should return an OperationOutcome resource");
    });

    it("Search - Unauthorized access", async () => {
        const response = await fetchWrapper({
            authorized: false,  // Explicitly not authorizing this request
            relativeUrl: "Patient?name=Test",
        });

        assertEquals(response.success, false, "Unauthorized search should fail");
        assertEquals(response.status, 401, "Should return 401 Unauthorized");
    });

    it("Search - Unsupported resource type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedResource?param=value",
        });

        assertEquals(response.success, false, "Search for unsupported resource type should fail");
        assertEquals(response.status, 404, "Should return 404 Not Found");
    });

    it("Search - Method not allowed", async () => {
        // This test assumes your server might restrict one of GET or POST for search
        // Adjust as necessary based on your server's behavior
        const getResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        const postResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/_search",
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: "name=Test",
        });

        assertEquals(getResponse.status === 405 && postResponse.status === 405, false, "One of GET or POST should return 405 Method Not Allowed");
        assertEquals(getResponse.status === 200 || postResponse.status === 200, true, "The other method should be successful");
    });


    async function createTestPatient(_context: ITestContext, family: string): Promise<Patient> {
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: family }],
            gender: 'male',
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
}
