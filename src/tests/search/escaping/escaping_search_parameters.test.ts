// tests/search/escaping/escaping_search_parameters.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
    createTestValueSet,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runEscapingSearchParametersTests(context: ITestContext) {
    it("Should handle unescaped comma as OR operator", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "a",
            system: "http://example.com",
        });
        await createTestObservation(context, patient.id!, {
            code: "b",
            system: "http://example.com",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=a,b`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with unescaped comma successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 observations for code=a,b",
        );
    });

    it("Should handle escaped comma as literal value", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "a,b",
            system: "http://example.com",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=a\\,b`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped comma successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for code=a\\,b",
        );
    });

    it("Should handle escaped dollar sign as literal value", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "test$code",
            system: "http://example.com",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=test\\$code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped dollar sign successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for code=test\\$code",
        );
    });

    it("Should handle escaped pipe as literal value", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "test|code",
            system: "http://example.com",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=test\\|code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped pipe successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for code=test\\|code",
        );
    });

    it("Should handle escaped backslash as literal value", async () => {
        const patient = await createTestPatient(context);
        await createTestObservation(context, patient.id!, {
            code: "test\\code",
            system: "http://example.com",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=test\\\\code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped backslash successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 observation for code=test\\\\code",
        );
    });

    it("Should handle mix of escaped and unescaped delimiters", async () => {
        const url1 = uniqueString("http://acme.org/fhir/ValueSet/123");
        const url2 = uniqueString(
            "http://acme.org/fhir/ValueSet/124,ValueSet/125", // Regular URI - no escape needed
        );

        // Create ValueSets with unescaped URIs
        await createTestValueSet(context, { url: url1 });
        await createTestValueSet(context, { url: url2 });

        // When searching:
        // 1. Escape the comma in url2 for search syntax
        // 2. Encode both URIs
        const searchUrl2 = url2.replace(/,/g, "\\,");

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${encodeURIComponent(url1)},${
                encodeURIComponent(searchUrl2)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with mix of escaped and unescaped delimiters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 ValueSets for the given URLs",
        );
    });

    it("Should handle percent-encoded URLs", async () => {
        const url1 = uniqueString("http://acme.org/fhir/ValueSet/123");
        const url2 = uniqueString("http://acme.org/fhir/ValueSet/124");
        const url3 = uniqueString("http://acme.org/fhir/ValueSet/125");

        await createTestValueSet(context, { url: url1 });
        await createTestValueSet(context, { url: url2 });
        await createTestValueSet(context, { url: url3 });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${encodeURIComponent(url1)},${
                encodeURIComponent(url2)
            },${encodeURIComponent(url3)}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with percent-encoded URLs successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Should find 3 ValueSets for the given URLs",
        );
    });

    it("Should handle combination of percent-encoding and escaping", async () => {
        const url1 = uniqueString("http://acme.org/fhir/ValueSet/123");
        const url2 = uniqueString(
            "http://acme.org/fhir/ValueSet/124,ValueSet/125",
        );

        await createTestValueSet(context, { url: url1 });
        await createTestValueSet(context, { url: url2 });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${encodeURIComponent(url1)}%2C${
                encodeURIComponent(url2.replace(",", "\\,"))
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with combination of percent-encoding and escaping successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 ValueSets for the given URLs",
        );
    });
}
