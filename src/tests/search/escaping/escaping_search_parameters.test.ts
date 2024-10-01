// tests/search/escaping/escaping_search_parameters.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestObservation, createTestPatient, createTestValueSet } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runEscapingSearchParametersTests(context: ITestContext) {
  it("Should handle unescaped comma as OR operator", async () => {
    const patient = await createTestPatient(context);
    await createTestObservation(context, patient.id!, { code: "a", system: "http://example.com" });
    await createTestObservation(context, patient.id!, { code: "b", system: "http://example.com" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code=a,b`,
    });

    assertEquals(response.status, 200, "Server should process search with unescaped comma successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 2, "Should find 2 observations for code=a,b");
  });

  it("Should handle escaped comma as literal value", async () => {
    const patient = await createTestPatient(context);
    await createTestObservation(context, patient.id!, { code: "a,b", system: "http://example.com" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code=a\\,b`,
    });

    assertEquals(response.status, 200, "Server should process search with escaped comma successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 observation for code=a\\,b");
  });

  it("Should handle escaped dollar sign as literal value", async () => {
    const patient = await createTestPatient(context);
    await createTestObservation(context, patient.id!, { code: "test$code", system: "http://example.com" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code=test\\$code`,
    });

    assertEquals(response.status, 200, "Server should process search with escaped dollar sign successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 observation for code=test\\$code");
  });

  it("Should handle escaped pipe as literal value", async () => {
    const patient = await createTestPatient(context);
    await createTestObservation(context, patient.id!, { code: "test|code", system: "http://example.com" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code=test\\|code`,
    });

    assertEquals(response.status, 200, "Server should process search with escaped pipe successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 observation for code=test\\|code");
  });

  it("Should handle escaped backslash as literal value", async () => {
    const patient = await createTestPatient(context);
    await createTestObservation(context, patient.id!, { code: "test\\code", system: "http://example.com" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code=test\\\\code`,
    });

    assertEquals(response.status, 200, "Server should process search with escaped backslash successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 observation for code=test\\\\code");
  });

  it("Should handle mix of escaped and unescaped delimiters", async () => {
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/123" });
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/124,ValueSet/125" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url=http://acme.org/fhir/ValueSet/123,http://acme.org/fhir/ValueSet/124\\,ValueSet/125`,
    });

    assertEquals(response.status, 200, "Server should process search with mix of escaped and unescaped delimiters successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 2, "Should find 2 ValueSets for the given URLs");
  });

  it("Should handle percent-encoded URLs", async () => {
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/123" });
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/124" });
    await createTestValueSet(context, { url: "ValueSet/125" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url=http%3A%2F%2Facme.org%2Ffhir%2FValueSet%2F123%2Chttp%3A%2F%2Facme.org%2Ffhir%2FValueSet%2F124%2CValueSet%2F125`,
    });

    assertEquals(response.status, 200, "Server should process search with percent-encoded URLs successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 3, "Should find 3 ValueSets for the given URLs");
  });

  it("Should handle combination of percent-encoding and escaping", async () => {
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/123" });
    await createTestValueSet(context, { url: "http://acme.org/fhir/ValueSet/124,ValueSet/125" });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url=http://acme.org/fhir/ValueSet/123%2Chttp://acme.org/fhir/ValueSet/124\\,ValueSet/125`,
    });

    assertEquals(response.status, 200, "Server should process search with combination of percent-encoding and escaping successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 2, "Should find 2 ValueSets for the given URLs");
  });
}