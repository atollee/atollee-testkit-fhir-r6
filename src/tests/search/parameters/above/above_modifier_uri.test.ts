// tests/search/parameters/above_modifier_uri.test.ts

import { assertEquals, assertExists, assertFalse, assertTrue, it } from "../../../../../deps.test.ts";
import { fetchWrapper } from "../../../utils/fetch.ts";
import { createTestValueSet } from "../../../utils/resource_creators.ts";
import { Bundle, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

function uniqueString(base: string): string {
  return `${base}-${Date.now()}`;
}

export function runAboveModifierUriTests(context: ITestContext) {
  it("Should find ValueSets with URLs above the specified URL", async () => {
    const baseUrl = uniqueString("http://acme.org/fhir/ValueSet");
    
    await createTestValueSet(context, {
      url: `${baseUrl}/123/_history/5`,
      name: "TestValueSet1",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/123/_history`,
      name: "TestValueSet2",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}/123`,
      name: "TestValueSet3",
      status: "active"
    });
    await createTestValueSet(context, {
      url: `${baseUrl}`,
      name: "TestValueSet4",
      status: "active"
    });
    await createTestValueSet(context, {
      url: "http://acme.org/fhir",
      name: "TestValueSet5",
      status: "active"
    });
    await createTestValueSet(context, {
      url: "http://acme.org",
      name: "TestValueSet6",
      status: "active"
    });
    // Create a ValueSet with an unrelated URL
    await createTestValueSet(context, {
      url: "http://example.com/fhir/ValueSet/456",
      name: "TestValueSet7",
      status: "active"
    });

    const searchUrl = `${baseUrl}/123/_history/5`;
    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:above=${encodeURIComponent(searchUrl)}`,
    });

    assertEquals(response.status, 200, "Server should process search with above modifier on URI successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 6, "Bundle should contain six matching ValueSets");

    const urls = bundle.entry.map(entry => (entry.resource as ValueSet).url);
    assertTrue(urls.includes(`${baseUrl}/123/_history/5`), "Results should include the exact URL");
    assertTrue(urls.includes(`${baseUrl}/123/_history`), "Results should include parent URL");
    assertTrue(urls.includes(`${baseUrl}/123`), "Results should include ancestor URL");
    assertTrue(urls.includes(`${baseUrl}`), "Results should include ancestor URL");
    assertTrue(urls.includes("http://acme.org/fhir"), "Results should include ancestor URL");
    assertTrue(urls.includes("http://acme.org"), "Results should include ancestor URL");
    assertFalse(urls.includes("http://example.com/fhir/ValueSet/456"), "Results should not include unrelated URL");
  });

  it("Should not match URNs when using above modifier", async () => {
    const urn = "urn:oid:2.16.840.1.113883.4.642.3.508";
    await createTestValueSet(context, {
      url: urn,
      name: "TestValueSetURN",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:above=${encodeURIComponent(urn)}`,
    });

    assertEquals(response.status, 200, "Server should process search with above modifier on URN");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 0, "Bundle should not contain any matching ValueSets");
  });

  it("Should handle partial URL matching", async () => {
    const baseUrl = uniqueString("http://acme.org/fhir/ValueSet");
    
    await createTestValueSet(context, {
      url: `${baseUrl}/partial`,
      name: "TestValueSetPartial",
      status: "active"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url:above=${encodeURIComponent(baseUrl)}`,
    });

    assertEquals(response.status, 200, "Server should process search with above modifier on partial URL");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(bundle.entry.length > 0, "Bundle should contain at least one matching ValueSet");
    const valueSet = bundle.entry[0].resource as ValueSet;
    assertEquals(valueSet.url, `${baseUrl}/partial`, "Returned ValueSet should have the correct URL");
  });
}