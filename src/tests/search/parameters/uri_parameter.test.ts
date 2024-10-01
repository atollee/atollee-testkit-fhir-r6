// tests/search/parameters/uri_parameter.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestValueSet } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runUriParameterTests(context: ITestContext) {
    it("Should search for exact URI match", async () => {
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/123",
        });
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/456",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=http://acme.org/fhir/ValueSet/123`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process exact URI search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with the exact URL",
        );
    });

    it("Should search using :below modifier", async () => {
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/123",
        });
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/456",
        });
        await createTestValueSet(context, {
            url: "http://example.com/fhir/ValueSet/789",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:below=http://acme.org/fhir/`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :below modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 ValueSets with URLs starting with the given prefix",
        );
    });

    it("Should search using :above modifier", async () => {
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/123",
        });
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/123/_history/1",
        });
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/456",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url:above=http://acme.org/fhir/ValueSet/123/_history/5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :above modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with a URL that matches or is above the given URL",
        );
    });

    it("Should search for URN (OID) exactly", async () => {
        await createTestValueSet(context, { url: "urn:oid:1.2.3.4.5" });
        await createTestValueSet(context, { url: "urn:oid:1.2.3.4.6" });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=urn:oid:1.2.3.4.5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process URN (OID) search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with the exact OID",
        );
    });

    it("Should not apply :above or :below modifiers to URNs", async () => {
        await createTestValueSet(context, { url: "urn:oid:1.2.3.4.5" });
        await createTestValueSet(context, { url: "urn:oid:1.2.3.4.6" });

        const responseAbove = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:above=urn:oid:1.2.3.4`,
        });

        const responseBelow = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url:below=urn:oid:1.2.3.4`,
        });

        assertEquals(
            responseAbove.status,
            200,
            "Server should process :above modifier on URN without error",
        );
        assertEquals(
            responseBelow.status,
            200,
            "Server should process :below modifier on URN without error",
        );

        const bundleAbove = responseAbove.jsonBody as Bundle;
        const bundleBelow = responseBelow.jsonBody as Bundle;

        assertEquals(
            bundleAbove.entry?.length,
            0,
            "Should not find any ValueSets using :above on URN",
        );
        assertEquals(
            bundleBelow.entry?.length,
            0,
            "Should not find any ValueSets using :below on URN",
        );
    });

    it("Should be case-sensitive for URI searches", async () => {
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/TEST",
        });
        await createTestValueSet(context, {
            url: "http://acme.org/fhir/ValueSet/test",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=http://acme.org/fhir/ValueSet/TEST`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process case-sensitive URI search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with the exact case-sensitive URL",
        );
    });
}
