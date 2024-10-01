// tests/search/parameters/code_text_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runCodeTextModifierTests(context: ITestContext) {
    it("Should match exact language code case-insensitively", async () => {
        const patient = await createTestPatient(context, {
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "en" }],
                },
            }],
        });

        const patientId = patient.id;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?language:code-text=en`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patientId
            ),
            "Results should include the created patient",
        );
    });

    it("Should match language code starting with the search term", async () => {
        const patient = await createTestPatient(context, {
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "en-AU" }],
                },
            }],
        });

        const patientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?language:code-text=en`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patientId
            ),
            "Results should include the created patient",
        );
    });

    it("Should match language code case-insensitively", async () => {
        const patient = await createTestPatient(context, {
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "en-GB" }],
                },
            }],
        });

        const patientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?language:code-text=EN`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patientId
            ),
            "Results should include the created patient",
        );
    });

    it("Should not match language code that doesn't start with the search term", async () => {
        const patient = await createTestPatient(context, {
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "fr-CA" }],
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?language:code-text=en`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertFalse(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Results should not include the created patient",
        );
    });

    it("Should work with token type search parameters", async () => {
        const patient = await createTestPatient(context, {
            gender: "male",
        });

        const patientId = patient.id;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?gender:code-text=ma`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier on token type successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patientId
            ),
            "Results should include the created patient",
        );
    });

    it("Should work with reference type search parameters", async () => {
        const organizationId = uniqueString("Organization");
        const patient = await createTestPatient(context, {
            managingOrganization: {
                reference: `Organization/${organizationId}`,
            },
        });

        const patientId = patient.id;

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?organization:code-text=${organizationId}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier on reference type successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one matching Patient",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as Patient).id === patientId
            ),
            "Results should include the created patient",
        );
    });
}
