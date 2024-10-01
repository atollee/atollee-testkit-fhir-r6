// tests/search/parameters/below_modifier_uri.test.ts

import { assertEquals, assertExists, assertFalse, assertTrue, it } from "../../../../../deps.test.ts";
import { fetchWrapper } from "../../../utils/fetch.ts";
import { createTestValueSet } from "../../../utils/resource_creators.ts";
import { Bundle, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

function uniqueString(base: string): string {
  return `${base}-${Date.now()}`;
}

export function runBelowModifierUriTests(context: ITestContext) {
  it("Should find ValueSets with URLs below the specified URL", async () => {
    const baseUrl = uniqueString("http://acme.org/fhir");
    
    await createTestValueSet(context, {
      url: baseUrl,
      name: "TestValueSet1",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet`,
      name: "TestValueSet2",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet/123`,
      name: "TestValueSet3",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet/123/_history`,
      name: "TestValueSet4",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet/123/_history/1`,
      name: "TestValueSet5",
      status: "active"
    });
    // Create a ValueSet with an unrelated URL
    await createTestValueSet(context, {
      url: "http://example.com/fhir/ValueSet/456",
      name: "TestValueSet6",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:below=${encodeURIComponent(baseUrl)}`,
    });

    assertEquals(response.status, 200, "Server should process search with below modifier on URI successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 5, "Bundle should contain five matching ValueSets");

    const urls = bundle.entry.map(entry => (entry.resource as ValueSet).url);
    assertTrue(urls.includes(baseUrl), "Results should include the exact URL");
    assertTrue(urls.includes(`${baseUrl}/ValueSet`), "Results should include child URL");
    assertTrue(urls.includes(`${baseUrl}/ValueSet/123`), "Results should include descendant URL");
    assertTrue(urls.includes(`${baseUrl}/ValueSet/123/_history`), "Results should include descendant URL");
    assertTrue(urls.includes(`${baseUrl}/ValueSet/123/_history/1`), "Results should include descendant URL");
    assertFalse(urls.includes("http://example.com/fhir/ValueSet/456"), "Results should not include unrelated URL");
  });

  it("Should not match URNs when using below modifier", async () => {
    const urn = "urn:oid:2.16.840.1.113883.4.642.3.508";
    await createTestValueSet(context, {
      url: urn,
      name: "TestValueSetURN",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:below=${encodeURIComponent(urn)}`,
    });

    assertEquals(response.status, 200, "Server should process search with below modifier on URN");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 0, "Bundle should not contain any matching ValueSets");
  });

  it("Should handle partial URL matching", async () => {
    const baseUrl = uniqueString("http://acme.org/fhir");
    
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet/partial`,
      name: "TestValueSetPartial",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:below=${encodeURIComponent(baseUrl)}`,
    });

    assertEquals(response.status, 200, "Server should process search with below modifier on partial URL");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(bundle.entry.length > 0, "Bundle should contain at least one matching ValueSet");
    const valueSet = bundle.entry[0].resource as ValueSet;
    assertEquals(valueSet.url, `${baseUrl}/ValueSet/partial`, "Returned ValueSet should have the correct URL");
  });

  it("Should not match URLs that are not below the specified URL", async () => {
    const baseUrl = uniqueString("http://acme.org/fhir");
    
    await createTestValueSet(context, {
      url: `${baseUrl}/ValueSet/123`,
      name: "TestValueSetBelow",
      status: "active"
    });
    await createTestValueSet(context, {
      url: "http://acme.org/other/ValueSet/456",
      name: "TestValueSetNotBelow",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:below=${encodeURIComponent(baseUrl)}`,
    });

    assertEquals(response.status, 200, "Server should process search with below modifier on URI successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Bundle should contain one matching ValueSet");
    const valueSet = bundle.entry[0].resource as ValueSet;
    assertEquals(valueSet.url, `${baseUrl}/ValueSet/123`, "Returned ValueSet should have the correct URL");
  });
}