// tests/search/parameters/named_queries.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestLocation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, OperationDefinition, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runNamedQueriesTests(context: ITestContext) {
    it("Should execute a named query without additional parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_query=current-high-risk`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should execute a named query with a specific parameter", async () => {
        const ward = await createTestLocation(context, {
            name: uniqueString("TestWard"),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_query=current-high-risk&ward=Location/${ward.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query with parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should execute a named query with a standard search parameter", async () => {
        const patient = await createTestPatient(context, {
            birthDate: "1980-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_query=current-high-risk&birthdate=ge1970-01-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query with standard parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Results should include the patient born after 1970-01-01",
        );
    });

    it("Should execute a named query with both specific and standard parameters", async () => {
        const ward = await createTestLocation(context, {
            name: uniqueString("TestWard"),
        });

        const patient = await createTestPatient(context, {
            birthDate: "1980-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_query=current-high-risk&ward=Location/${ward.id}&birthdate=ge1970-01-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query with multiple parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Results should include the patient born after 1970-01-01",
        );
    });

    it("Should handle named query with unordered parameters", async () => {
        const ward = await createTestLocation(context, {
            name: uniqueString("TestWard"),
        });

        const response1 = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_query=current-high-risk&ward=Location/${ward.id}&birthdate=ge1970-01-01`,
        });

        const response2 = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?birthdate=ge1970-01-01&_query=current-high-risk&ward=Location/${ward.id}`,
        });

        assertEquals(
            response1.status,
            200,
            "Server should process the first query successfully",
        );
        assertEquals(
            response2.status,
            200,
            "Server should process the second query successfully",
        );

        const bundle1 = response1.jsonBody as Bundle;
        const bundle2 = response2.jsonBody as Bundle;

        assertEquals(
            bundle1.total,
            bundle2.total,
            "Both queries should return the same number of results",
        );
    });

    it("Should return OperationDefinition for named query", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `OperationDefinition/current-high-risk`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return the OperationDefinition successfully",
        );
        const operationDefinition = response.jsonBody as OperationDefinition;
        assertEquals(
            operationDefinition.resourceType,
            "OperationDefinition",
            "Returned resource should be an OperationDefinition",
        );
        assertEquals(
            operationDefinition.code,
            "current-high-risk",
            "OperationDefinition should have the correct code",
        );
        assertEquals(
            operationDefinition.kind,
            "query",
            "OperationDefinition should be of kind 'query'",
        );
    });

    it("Should not allow invoking named query via operation endpoint", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/$current-high-risk`,
            method: "POST",
            body: JSON.stringify({}),
        });

        assertEquals(
            response.status,
            400,
            "Server should reject invoking named query via operation endpoint",
        );
    });
}
