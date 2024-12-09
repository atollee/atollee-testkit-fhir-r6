// tests/create.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";

export function runCreateTests(_context: ITestContext) {
    it("Create - Successful creation", async () => {
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Create"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Create should be successful");
        assertEquals(response.status, 201, "Should return 201 Created");
        assertExists(
            response.headers.get("Location"),
            "Should return a Location header",
        );
        assertExists(
            response.headers.get("ETag"),
            "Should return an ETag header",
        );
        assertExists(
            response.headers.get("Last-Modified"),
            "Should return a Last-Modified header",
        );

        const createdPatient = response.jsonBody as Patient;
        assertExists(createdPatient.id, "Created resource should have an id");
        assertExists(
            createdPatient.meta?.versionId,
            "Created resource should have a versionId",
        );
        assertExists(
            createdPatient.meta?.lastUpdated,
            "Created resource should have a lastUpdated timestamp",
        );
    });

    it("Create - Ignore provided id", async () => {
        const newPatient: Patient = {
            resourceType: "Patient",
            id: "should-be-ignored",
            name: [{ family: "Test", given: ["IgnoreId"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Create should be successful");
        assertEquals(response.status, 201, "Should return 201 Created");

        const createdPatient = response.jsonBody as Patient;
        assertNotEquals(
            createdPatient.id,
            "should-be-ignored",
            "Server should ignore provided id",
        );
    });

    it("Create - Ignore provided meta.versionId and meta.lastUpdated", async () => {
        const newPatient: Patient = {
            resourceType: "Patient",
            meta: {
                versionId: "should-be-ignored",
                lastUpdated: "2000-01-01T00:00:00Z",
            },
            name: [{ family: "Test", given: ["IgnoreMeta"] }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(response.success, true, "Create should be successful");
        assertEquals(response.status, 201, "Should return 201 Created");

        const createdPatient = response.jsonBody as Patient;
        assertNotEquals(
            createdPatient.meta?.versionId,
            "should-be-ignored",
            "Server should ignore provided versionId",
        );
        assertNotEquals(
            createdPatient.meta?.lastUpdated,
            "2000-01-01T00:00:00Z",
            "Server should ignore provided lastUpdated",
        );
    });

    it("Create - Invalid resource", async () => {
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

        assertEquals(
            response.success,
            false,
            "Create with invalid resource should fail",
        );
        assertEquals(
            response.status,
            400,
            "Should return 400 Bad Request for invalid resource",
        );

        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "Response should include an OperationOutcome with issues",
        );
    });

    it("Create - Unsupported resource type", async () => {
        const unsupportedResource = {
            resourceType: "UnsupportedType",
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "UnsupportedType",
            method: "POST",
            body: JSON.stringify(unsupportedResource),
        });

        assertEquals(
            response.success,
            false,
            "Create with unsupported resource type should fail",
        );
        assertEquals(
            response.status,
            404,
            "Should return 404 Not Found for unsupported resource type",
        );
    });
}
