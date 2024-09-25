// tests/conditional_update.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runConditionalUpdateTests(_context: ITestContext) {
    it("Conditional Update - No matches, create new resource", async () => {
        const value = Date.now();
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Doe", given: ["John"] }],
            identifier: [{ system: "http://example.com/identifier", value: `${value}` }],
        };
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=http://example.com/identifier|${value}`,
            method: "PUT",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Conditional create should be successful");
        assertEquals(response.status, 201, "Should return 201 Created for new resource");
        assertExists(response.headers.get("Location"), "Response should include a Location header");
    });

    it("Conditional Update - One match, update existing resource", async () => {
        const value = `67890-${Date.now()}`;
        // First, create a patient
        const initialPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Doe", given: ["Jane"] }],
            identifier: [{ system: "http://example.com/identifier", value }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(initialPatient),
        });

        // Now, update the patient conditionally
        const updatedPatient: Patient = {
            ...initialPatient,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=http://example.com/identifier|${value}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(response.success, true, "Conditional update should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for updated resource");
    });

    it("Conditional Update - Multiple matches", async () => {
        // First, create multiple patients with the same identifier
        const patient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Smith" }],
            identifier: [{ system: "http://example.com/identifier", value: "multi-match" }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(patient),
        });

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(patient),
        });

        // Now, try to update conditionally
        const updatedPatient: Patient = {
            ...patient,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?identifier=http://example.com/identifier|multi-match",
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(response.success, false, "Conditional update with multiple matches should fail");
        assertEquals(response.status, 412, "Should return 412 Precondition Failed for multiple matches");
    });

    it("Conditional Update - If-None-Match (specific version)", async () => {
        // First, create a patient
        const initialPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Johnson" }],
            identifier: [{ system: "http://example.com/identifier", value: "if-none-match-test" }],
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(initialPatient),
        });

        const createdPatient = createResponse.jsonBody as Patient;
        const initialETag = createResponse.headers.get("ETag");

        // Now, try to update conditionally with If-None-Match
        const updatedPatient: Patient = {
            ...createdPatient,
            active: true,
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${createdPatient.id}`,
            method: "PUT",
            headers: {
                "If-None-Match": initialETag!,
            },
            body: JSON.stringify(updatedPatient),
        });
        assertEquals(response.success, false, "Conditional update with matching ETag should fail");
        assertEquals(response.status, 412, "Should return 412 Precondition Failed for matching ETag");
    });

    it("Conditional Update - If-None-Match (wildcard)", async () => {
        const value = `if-none-match-wildcard-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Brown" }],
            identifier: [{ system: "http://example.com/identifier", value }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=http://example.com/identifier|${value}`,
            method: "PUT",
            headers: {
                "If-None-Match": "*",
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Conditional create with If-None-Match wildcard should be successful");
        assertEquals(response.status, 201, "Should return 201 Created for new resource");
    });
}
