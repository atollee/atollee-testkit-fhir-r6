// tests/search/parameters/multiple_resource_types.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestObservation,
    createTestPatient,
    createTestPerson,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Condition,
    Observation,
    OperationOutcome,
    Patient,
    Person,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runSearchingMultipleResourceTypesTests(context: ITestContext) {
    it("Should search across all resource types using base parameters", async () => {
        const uniqueId = uniqueString("TestId");
        const patient = await createTestPatient(context, {
            identifier: [{ value: uniqueId }],
        });
        await createTestObservation(context, patient.id!, {
            identifier: [{ value: uniqueId }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?identifier=${uniqueId}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search across all resource types successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Two resources should be returned",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Patient"
            ),
            "Results should include a Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Observation"
            ),
            "Results should include an Observation",
        );
    });

    it("Should search using type-specific parameters when a single type is specified", async () => {
        const uniqueName = uniqueString("TestName");
        const patient = await createTestPatient(context, {
            name: [{ given: [uniqueName] }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Patient&given=${uniqueName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with a single type successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "One Patient should be returned");
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "The returned Patient should match the created one",
        );
    });

    it("Should search across multiple specified resource types using common parameters", async () => {
        const uniqueName = uniqueString("TestName");
        const patient = await createTestPatient(context, {
            name: [{ given: [uniqueName] }],
        });
        const person = await createTestPerson(context, {
            name: [{ given: [uniqueName] }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Patient,Person&name=${uniqueName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search across multiple resource types successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Two resources should be returned",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Results should include the created Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Person).id === person.id
            ),
            "Results should include the created Person",
        );
    });

    it("Should return an error when using incompatible parameters across multiple resource types", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `?_type=Patient,Observation&birthDate=2000-01-01&value-quantity=50`,
        });

        assertEquals(
            response.status,
            400,
            "Server should return a 400 status for incompatible parameters",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });

    it("Should handle searches with multiple resource types and multiple parameters", async () => {
        const uniqueCode = uniqueString("TestCode");
        const patient = await createTestPatient(context, {});
        const observation = await createTestObservation(context, patient.id!, {
            code: uniqueCode,
            system: "http://loinc.org",
        });
        const condition = await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: uniqueCode,
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `?_type=Observation,Condition&code=${uniqueCode}&subject=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with multiple types and parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Two resources should be returned",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Observation).id === observation.id
            ),
            "Results should include the created Observation",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Condition).id === condition.id
            ),
            "Results should include the created Condition",
        );
    });
}
