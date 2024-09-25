// tests/http-status-codes.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { OperationOutcome } from "npm:@types/fhir/r4.d.ts";

export function runHttpStatusCodeTests(context: ITestContext) {
    const validPatientId = context.getValidPatientId(); // Use a known valid patient ID
    const invalidPatientId = "non-existent-patient-" + Date.now(); // Use a known invalid patient ID

    it("HTTP Status Codes - 200 OK for successful read", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(response.success, true, "Successful read should return true success");
        assertEquals(response.status, 200, "Successful read should return 200 OK");
    });

    it("HTTP Status Codes - 201 Created for successful create", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Create"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Successful create should return true success");
        assertEquals(response.status, 201, "Successful create should return 201 Created");
        assertExists(response.headers.get("Location"), "Created resource should have a Location header");
    });

    it("HTTP Status Codes - 404 Not Found for non-existent resource", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${invalidPatientId}`,
        });

        assertEquals(response.success, false, "Request for non-existent resource should fail");
        assertEquals(response.status, 404, "Non-existent resource should return 404 Not Found");
    });

    it("HTTP Status Codes - 400 Bad Request for invalid input", async () => {
        const invalidPatient = {
            resourceType: "Patient",
            invalidField: "This field doesn't exist",
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(invalidPatient),
        });

        assertEquals(response.success, false, "Invalid input should fail");
        assertEquals(response.status, 400, "Invalid input should return 400 Bad Request");
    });

    it("HTTP Status Codes - 422 Unprocessable Entity for valid format but invalid content", async () => {
        const invalidContentPatient = {
            resourceType: "Patient",
            birthDate: "Invalid Date Format",
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(invalidContentPatient),
        });

        assertEquals(response.success, false, "Invalid content should fail");
        assertEquals(response.status, 422, "Invalid content should return 422 Unprocessable Entity");
    });

    it("HTTP Status Codes - OperationOutcome for 4xx errors", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${invalidPatientId}`,
        });

        assertEquals(response.success, false, "Request should fail");
        assertEquals(response.status >= 400 && response.status < 500, true, "Should be a 4xx error");

        const operationOutcome = response.jsonBody as OperationOutcome;
        assertEquals(operationOutcome.resourceType, "OperationOutcome", "4xx error should return an OperationOutcome");
        assertExists(operationOutcome.issue, "OperationOutcome should have an issue array");
        assertExists(operationOutcome.issue[0].severity, "Issue should have a severity");
        assertExists(operationOutcome.issue[0].code, "Issue should have a code");

        assertEquals(operationOutcome.issue[0].code, "not-found", "Issue code should be 'not-found' for a non-existent resource");
    });

    it("HTTP Status Codes - 401 Forbidden for unauthorized access", async () => {
        const response = await fetchWrapper({
            authorized: false,  // Attempting access without authorization
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(response.success, false, "Unauthorized access should fail");
        assertEquals(response.status, 401, "Unauthorized access should return 403 Forbidden");
    });
}
