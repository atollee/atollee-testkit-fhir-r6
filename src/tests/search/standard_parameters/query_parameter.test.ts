// tests/search/parameters/query_parameter.test.ts

import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient, createTestEncounter } from "../../utils/resource_creators.ts";
import { Bundle, OperationDefinition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runQueryParameterTests(context: ITestContext) {
  // Assume we have a named query "current-high-risk" defined on the server
  const namedQuery = "current-high-risk";

  it("Should execute a named query successfully", async () => {
    // Create some test data
    const patient = await createTestPatient(context, { name: [{ given: ["TestPatient"] }] });
    await createTestEncounter(context, {
      subject: { reference: `Patient/${patient.id}` },
      status: "in-progress",
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?_query=${namedQuery}`,
    });

    assertEquals(response.status, 200, "Server should process _query parameter successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(bundle.entry.length > 0, "Bundle should contain at least one entry");
  });

  it("Should execute a named query with additional parameters", async () => {
    const ward = "1A";
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?_query=${namedQuery}&ward=${ward}`,
    });

    assertEquals(response.status, 200, "Server should process _query with additional parameters successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
  });

  it("Should reject request with unrecognized query name", async () => {
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?_query=non-existent-query`,
    });

    assertEquals(response.status, 400, "Server should reject request with unrecognized query name");
  });

  it("Should reject request with multiple _query parameters", async () => {
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?_query=${namedQuery}&_query=another-query`,
    });

    assertEquals(response.status, 400, "Server should reject request with multiple _query parameters");
  });

  it("Should return OperationDefinition for named query", async () => {
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `OperationDefinition/${namedQuery}`,
    });

    assertEquals(response.status, 200, "Server should return OperationDefinition for named query");
    const operationDefinition = response.jsonBody as OperationDefinition;
    assertEquals(operationDefinition.resourceType, "OperationDefinition", "Returned resource should be an OperationDefinition");
    assertEquals(operationDefinition.code, namedQuery, "OperationDefinition should have the correct code");
    assertEquals(operationDefinition.kind, "query", "OperationDefinition should be of kind 'query'");
  });

  it("Should execute named query on multiple resource types", async () => {
    // Assume we have a named query "recent-updates" that works across resource types
    const multiTypeQuery = "recent-updates";
    
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `?_query=${multiTypeQuery}`,
    });

    assertEquals(response.status, 200, "Server should process _query across resource types successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(
      bundle.entry.some(entry => entry.resource?.resourceType === "Patient") &&
      bundle.entry.some(entry => entry.resource?.resourceType === "Encounter"),
      "Bundle should contain multiple resource types"
    );
  });
}