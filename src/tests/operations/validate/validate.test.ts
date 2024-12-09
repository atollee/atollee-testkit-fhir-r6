// tests/restful/operations/validate.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    FhirResource,
    OperationOutcome,
    Parameters,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runValidateTests(context: ITestContext) {
    it("Should validate resource without mode (general validation)", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            name: [{
                use: "official",
                family: "Chalmers",
                given: ["Peter", "James"],
            }],
            telecom: [{
                system: "phone",
                value: "(03) 5555 6473",
                use: "work",
            }],
            gender: "male",
            birthDate: "1974-12-25",
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [{
                name: "resource",
                resource: patient,
            }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process validation request",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(
            outcome.resourceType,
            "OperationOutcome",
            "Response should be an OperationOutcome",
        );
        assertTrue(
            outcome.issue?.every((issue) => issue.severity !== "error"),
            "Valid resource should not have errors",
        );
    });

    it("Should validate resource with mode=create", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            identifier: [{
                system: "http://example.org/fhir/ids",
                value: "12345",
            }],
            name: [{
                family: "Test",
                given: ["Create", "Mode"],
            }],
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "resource",
                    resource: patient,
                },
                {
                    name: "mode",
                    valueCode: "create",
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process create mode validation",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
    });

    it("Should validate resource with mode=update against existing resource", async () => {
        // First create a patient
        const patient = await createTestPatient(context, {
            family: "Update",
            given: ["Test", "Mode"],
        });

        // Now validate an update
        const updatePatient = {
            ...patient,
            name: [{
                family: "Update-Modified",
                given: ["Test", "Mode"],
            }],
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "resource",
                    resource: updatePatient,
                },
                {
                    name: "mode",
                    valueCode: "update",
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/$validate`,
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process update mode validation",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
    });

    it("Should validate resource with mode=delete", async () => {
        // First create a patient
        const patient = await createTestPatient(context, {
            family: "Delete",
            given: ["Test", "Mode"],
        });

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [{
                name: "mode",
                valueCode: "delete",
            }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/$validate`,
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process delete mode validation",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
    });

    it("Should validate resource against specific profile", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            meta: {
                profile: ["http://hl7.org/fhir/StructureDefinition/Patient"],
            },
            name: [{
                family: "Test",
                given: ["Profile", "Validation"],
            }],
            gender: "male",
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "resource",
                    resource: patient,
                },
                {
                    name: "profile",
                    valueCanonical:
                        "http://hl7.org/fhir/StructureDefinition/Patient",
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process profile validation",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
    });

    it("Should handle validation with malformed resource", async () => {
        const invalidPatient = {
            resourceType: "Patient",
            invalidField: "This should not be here",
            gender: "INVALID",
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [{
                name: "resource",
                resource: invalidPatient as FhirResource,
            }],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process validation even for invalid resources",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
        assertExists(outcome.issue, "Should have validation issues");
        assertTrue(
            outcome.issue.some((issue) => issue.severity === "error"),
            "Should have error severity issues",
        );
    });

    it("Should reject validate with mode=update without instance level URL", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            name: [{
                family: "Test",
            }],
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "resource",
                    resource: patient,
                },
                {
                    name: "mode",
                    valueCode: "update",
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            422,
            "Server should reject update mode without instance URL",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
        assertExists(outcome.issue, "Should have validation issues");
    });

    it("Should validate resource with usage context", async () => {
        const patient: Patient = {
            resourceType: "Patient",
            name: [{
                family: "Test",
                given: ["Usage", "Context"],
            }],
        };

        const parameters: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "resource",
                    resource: patient,
                },
                {
                    name: "usageContext",
                    valueUsageContext: {
                        code: {
                            system:
                                "http://terminology.hl7.org/CodeSystem/usage-context-type",
                            code: "venue",
                        },
                        valueCodeableConcept: {
                            coding: [{
                                system:
                                    "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                                code: "IMP",
                                display: "inpatient encounter",
                            }],
                        },
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient/$validate",
            method: "POST",
            body: JSON.stringify(parameters),
        });

        assertEquals(
            response.status,
            200,
            "Server should process validation with usage context",
        );
        const outcome = response.jsonBody as OperationOutcome;
        assertEquals(outcome.resourceType, "OperationOutcome");
    });
}
