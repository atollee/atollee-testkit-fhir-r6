// tests/search/parameters/text_modifier_reference_token.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runTextModifierReferenceTokenTests(context: ITestContext) {
    it("Should find conditions with codes that match text search on token parameter", async () => {
        const patient = await createTestPatient(context);

        const headacheCodes = [
            {
                system: "http://snomed.info/sct",
                code: "25064002",
                display: "Headache finding",
            },
            {
                system: "http://snomed.info/sct",
                code: "398987004",
                display: "Headache following lumbar puncture",
            },
            {
                system: "http://snomed.info/sct",
                code: "230480006",
                display: "Headache following myelography (disorder)",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "R51",
                display: "Headache",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "R51.0",
                display:
                    "Headache with orthostatic component, not elsewhere classified",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "R51.9",
                display: "Headache, unspecified",
            },
        ];

        for (const code of headacheCodes) {
            await createTestCondition(context, {
                subject: { reference: `Patient/${patient.id}` },
                code: {
                    coding: [code],
                },
            });
        }

        // Create a condition that should not match
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "735938006",
                    display: "Acute headache",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with text modifier on token parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            headacheCodes.length,
            `Should find ${headacheCodes.length} conditions with 'headache' in code text`,
        );

        for (const entry of bundle.entry) {
            const condition = entry.resource as Condition;
            assertTrue(
                condition.code?.coding?.some((coding) =>
                    coding.display?.toLowerCase().startsWith("headache")
                ),
                "Each found condition should have a code with 'headache' at the start of its display text",
            );
        }
    });

    it("Should find patients with identifiers that match text search on token parameter", async () => {
        const identifierText = uniqueString("TestIdentifier");

        await createTestPatient(context, {
            identifier: [{
                type: {
                    text: `${identifierText} Type`,
                },
                system: "http://example.com/identifier",
                value: "12345",
            }],
        });

        await createTestPatient(context, {
            identifier: [{
                type: {
                    text: "Some Other Type",
                },
                system: "http://example.com/identifier",
                value: "67890",
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier:text=${identifierText}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with text modifier on token parameter for identifiers successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one patient with matching identifier text",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertTrue(
            patient.identifier?.some((id) =>
                id.type?.text?.toLowerCase().startsWith(
                    identifierText.toLowerCase(),
                )
            ),
            "Found patient should have an identifier with matching text",
        );
    });

    it("Should perform case-insensitive search with text modifier", async () => {
        const patient = await createTestPatient(context);

        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "25064002",
                    display: "HEADACHE finding",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process case-insensitive search with text modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find the condition despite case differences",
        );
    });

    it("Should not find conditions with text that doesn't start with the search term", async () => {
        const patient = await createTestPatient(context);

        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "735938006",
                    display: "Acute headache",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            0,
            "Should not find conditions where 'headache' is not at the start of the text",
        );
    });

    it("Should reject text modifier on non-reference, non-token search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:text=1990`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject text modifier on non-reference, non-token search parameters",
        );
    });
}
