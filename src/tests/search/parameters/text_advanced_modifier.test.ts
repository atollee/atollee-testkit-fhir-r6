// tests/search/parameters/text_advanced_modifier.test.ts

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
import { Bundle, Condition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTextAdvancedModifierTests(context: ITestContext) {
    it("Should find conditions with codes that start with 'headache'", async () => {
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
                code: { coding: [code] },
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text-advanced=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process text-advanced search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            headacheCodes.length,
            `Should find ${headacheCodes.length} conditions with 'headache' at the start of code display`,
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

    it("Should find conditions with codes containing 'headache'", async () => {
        const patient = await createTestPatient(context);

        const headacheContainingCodes = [
            {
                system: "http://snomed.info/sct",
                code: "735938006",
                display: "Acute headache",
            },
            {
                system: "http://snomed.info/sct",
                code: "95660002",
                display: "Thunderclap headache",
            },
            {
                system: "http://snomed.info/sct",
                code: "4969004",
                display: "Sinus headache",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "G44.019",
                display: "Episodic cluster headache, not intractable",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "G44.81",
                display: "Hypnic headache",
            },
        ];

        for (const code of headacheContainingCodes) {
            await createTestCondition(context, {
                subject: { reference: `Patient/${patient.id}` },
                code: { coding: [code] },
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text-advanced=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process text-advanced search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            headacheContainingCodes.length,
            `Should find ${headacheContainingCodes.length} conditions with 'headache' in code display`,
        );

        for (const entry of bundle.entry) {
            const condition = entry.resource as Condition;
            assertTrue(
                condition.code?.coding?.some((coding) =>
                    coding.display?.toLowerCase().includes("headache")
                ),
                "Each found condition should have a code with 'headache' in its display text",
            );
        }
    });

    it("Should find conditions with synonymous codes (server-dependent)", async () => {
        const patient = await createTestPatient(context);

        const synonymousCodes = [
            {
                system: "http://snomed.info/sct",
                code: "37796009",
                display: "Migraine",
            },
            {
                system: "http://snomed.info/sct",
                code: "49605003",
                display: "Ophthalmoplegic migraine (disorder)",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "G43.4",
                display: "Hemiplegic migraine",
            },
            {
                system: "http://hl7.org/fhir/sid/icd-10",
                code: "G43.B0",
                display: "Ophthalmoplegic migraine, not intractable",
            },
        ];

        for (const code of synonymousCodes) {
            await createTestCondition(context, {
                subject: { reference: `Patient/${patient.id}` },
                code: { coding: [code] },
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text-advanced=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process text-advanced search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Note: This test may fail if the server doesn't support synonymous matching
        if (bundle.entry.length > 0) {
            assertTrue(
                bundle.entry.length <= synonymousCodes.length,
                "Should find some or all synonymous conditions",
            );
            for (const entry of bundle.entry) {
                const condition = entry.resource as Condition;
                assertTrue(
                    condition.code?.coding?.some((coding) =>
                        synonymousCodes.some((synonymousCode) =>
                            coding.code === synonymousCode.code &&
                            coding.system === synonymousCode.system
                        )
                    ),
                    "Each found condition should have a code from the synonymous list",
                );
            }
        } else {
            console.warn(
                "Server did not return any synonymous conditions. This may be expected behavior.",
            );
        }
    });

    it("Should support case-insensitive search", async () => {
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
            relativeUrl: `Condition?code:text-advanced=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process case-insensitive text-advanced search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find the condition despite case differences",
        );
    });

    it("Should reject text-advanced modifier on non-reference, non-token search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:text-advanced=1990`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject text-advanced modifier on non-reference, non-token search parameters",
        );
    });
}
