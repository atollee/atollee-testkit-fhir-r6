// tests/search/parameters/uri_parameter.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestValueSet,
    uniqueNumber,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runUriParameterTests(context: ITestContext) {
    it("Should search for exact URI match", async () => {
        const uniqueNumberValue = uniqueNumber();
        await createTestValueSet(context, {
            url: `http://acme.org/fhir${uniqueNumberValue}/ValueSet/123`,
        });
        await createTestValueSet(context, {
            url: `http://acme.org/fhir${uniqueNumberValue}/ValueSet/456`,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url=http://acme.org/fhir${uniqueNumberValue}/ValueSet/123`,
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
        const uniqueNumberValue = uniqueNumber();
        await createTestValueSet(context, {
            url: `http://acme.org/fhir${uniqueNumberValue}/ValueSet/123`,
        });
        await createTestValueSet(context, {
            url: `http://acme.org/fhir${uniqueNumberValue}/ValueSet/456`,
        });
        await createTestValueSet(context, {
            url: `http://example.com/fhir${uniqueNumberValue}/ValueSet/789`,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url:below=http://acme.org/fhir${uniqueNumberValue}/`,
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
        const uniqueNumberValue = uniqueNumber();
        await createTestValueSet(context, {
            url: `http://acme.org/fhir/ValueSet/${uniqueNumberValue}`,
        });
        await createTestValueSet(context, {
            url: `http://acme.org/fhir/ValueSet/${uniqueNumberValue}/_history/1`,
        });
        await createTestValueSet(context, {
            url: `http://acme.org/fhir/ValueSet/${uniqueNumberValue}1`,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url:above=http://acme.org/fhir/ValueSet/${uniqueNumberValue}/_history/5`,
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
        const uniqueNumberValue = uniqueNumber();
        const testValueSetOne = `urn:oid:1.2.3.${uniqueNumberValue}.5`;
        const testValueSetTwo = uniqueString(
            `urn:oid:1.2.3.${uniqueNumberValue}.6`,
        );
        await createTestValueSet(context, { url: testValueSetOne });
        await createTestValueSet(context, { url: testValueSetTwo });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${testValueSetOne}`,
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
        const uniqueNumberValue = uniqueNumber();
        const testValueSetOne = `urn:oid:1.2.3.${uniqueNumberValue}.5`;
        const testValueSetTwo = `urn:oid:1.2.3.${uniqueNumberValue}.6`;
        await createTestValueSet(context, { url: testValueSetOne });
        await createTestValueSet(context, { url: testValueSetTwo });

        // Test both :above and :below modifiers with URN
        const responseAbove = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url:above=urn:oid:1.2.3.${uniqueNumberValue}`,
        });

        const responseBelow = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet?url:below=urn:oid:1.2.3.${uniqueNumberValue}`,
        });

        // Server should accept the searches
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

        // Neither should apply hierarchical matching since these are URNs
        assertEquals(
            bundleAbove.entry?.length ?? 0,
            0,
            "Should not find any ValueSets using :above on URN - modifiers don't apply to URNs",
        );
        assertEquals(
            bundleBelow.entry?.length ?? 0,
            0,
            "Should not find any ValueSets using :below on URN - modifiers don't apply to URNs",
        );

        // Verify exact URN matching still works
        const responseExact = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${testValueSetOne}`,
        });

        assertEquals(responseExact.status, 200);
        const bundleExact = responseExact.jsonBody as Bundle;
        assertEquals(
            bundleExact.entry?.length ?? 0,
            1,
            "Exact URN matching should still work",
        );
    });

    it("Should be case-sensitive for URI searches", async () => {
        const testSetUrlOne = uniqueString(
            "http://acme.org/fhir/ValueSet/TEST",
        );
        const testSetUrlTwo = uniqueString(
            "http://acme.org/fhir/ValueSet/test",
        );
        await createTestValueSet(context, {
            url: testSetUrlOne,
        });
        await createTestValueSet(context, {
            url: testSetUrlTwo,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${testSetUrlOne}`,
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
