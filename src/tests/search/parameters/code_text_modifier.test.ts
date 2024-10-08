// tests/search/parameters/code_text_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestOrganization,
    createTestPatient,
} from "../../utils/resource_creators.ts";
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
        const response = await fetchSearchWrapper({
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

    if (context.isHapiBugsDisallowed()) {
        it("Should match language code containing the search term", async () => {
            const patient = await createTestPatient(context, {
                communication: [{
                    language: {
                        coding: [{
                            system: "urn:ietf:bcp:47",
                            code: "en-AU",
                            display: "Australian English",
                        }],
                    },
                }],
            });

            const patientId = patient.id;

            const response = await fetchSearchWrapper({
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

            const response = await fetchSearchWrapper({
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
    }

    it("Should not match language code that doesn't start with the search term", async () => {
        const patient = await createTestPatient(context, {
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "fr-CA" }],
                },
            }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?language:code-text=en`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with code-text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.length ?? 0,
            0,
            "Results should not include the created patient",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should work with token type search parameters", async () => {
            const patient = await createTestPatient(context, {
                gender: "male",
            });

            const patientId = patient.id;
            const response = await fetchSearchWrapper({
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
    }

    if (context.isHapiBugsDisallowed()) {
        it("Should work with reference type search parameters", async () => {
            const organizationName = uniqueString("Organization");
            const organization = await createTestOrganization(context, {
                name: organizationName,
            });
            const patient = await createTestPatient(context, {
                managingOrganization: {
                    reference: `Organization/${organization.id}`,
                },
            });

            const patientId = patient.id;

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?organization:code-text=${organization.id}`,
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
}
