// tests/conditional_create.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runConditionalCreateTests(_context: ITestContext) {
    it("Conditional Create - No matches (successful creation)", async () => {
        const uniqueIdentifier = `unique-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: uniqueIdentifier }],
            name: [{ family: "Test", given: ["Conditional"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist": `identifier=${uniqueIdentifier}`,
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Conditional create with no matches should be successful");
        assertEquals(response.status, 201, "Should return 201 Created for successful creation");
        assertExists(response.headers.get("Location"), "Should return a Location header");
        assertExists(response.headers.get("ETag"), "Should return an ETag header");

        const createdPatient = response.jsonBody as Patient;
        assertExists(createdPatient.id, "Created resource should have an id");
    });

    it("Conditional Create - One match (resource already exists)", async () => {
        // First, create a patient
        const existingIdentifier = `existing-${Date.now()}`;
        const existingPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: existingIdentifier }],
            name: [{ family: "Existing", given: ["Patient"] }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(existingPatient),
        });

        // Now, try to conditionally create the same patient
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: existingIdentifier }],
            name: [{ family: "New", given: ["Patient"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist": `identifier=${existingIdentifier}`,
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Conditional create with one match should be successful");
        assertEquals(response.status, 200, "Should return 200 OK for existing resource");
        assertExists(response.headers.get("Location"), "Should return a Location header");
        assertExists(response.headers.get("ETag"), "Should return an ETag header");

        const returnedPatient = response.jsonBody as Patient;
        assertEquals(returnedPatient.name?.[0].family, "Existing", "Should return the existing patient, not create a new one");
    });

    it("Conditional Create - Multiple matches", async () => {
        // First, create multiple patients with the same identifier
        const commonIdentifier = `common-${Date.now()}`;
        const patient: Patient = {
            resourceType: "Patient",
            identifier: [{system: "http://example.com/identifier", value: commonIdentifier}],
            name: [{family: "Common", given: ["Patient"]}],
        };

        const patient1Response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(patient),
        });

        assertEquals(patient1Response.success, true, "created patient 1");
        const patient2Response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(patient),
        });
        assertEquals(patient2Response.success, true, "created patient 2");

        // Now, try to conditionally create a patient with the same identifier
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{system: "http://example.com/identifier", value: commonIdentifier}],
            name: [{family: "New", given: ["Patient"]}],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist": `identifier=${commonIdentifier}`,
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, false, "Conditional create with multiple matches should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request for multiple matches");
    });

    it("Conditional Create - Invalid If-None-Exist header", async () => {
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{family: "Test", given: ["Invalid"]}],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist": "invalid search parameters",
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, false, "Conditional create with invalid If-None-Exist header should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request for invalid If-None-Exist header");
    });

    it("Conditional Create - Unsupported operation", async () => {
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{family: "Test", given: ["Unsupported"]}],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            headers: {
                "If-None-Exist": "_count=1",  // Assuming _count is not supported for conditional create
            },
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, false, "Conditional create with unsupported search parameters should fail");
        assertEquals(response.status, 400, "Should return 400 Bad Request for unsupported operation");
    });
}
