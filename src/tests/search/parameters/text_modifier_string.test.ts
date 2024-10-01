// tests/search/parameters/text_modifier_string.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestComposition,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Composition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTextModifierStringTests(context: ITestContext) {
    it("Should find compositions with advanced text search on section text", async () => {
        const patient = await createTestPatient(context);

        // Create compositions with various section texts
        await createTestComposition(context, {
            status: "final",
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consult note",
                }],
            },
            subject: { reference: `Patient/${patient.id}` },
            sections: [{
                title: "Liver Metastases",
                text: {
                    status: "generated",
                    div: "<div>Patient presents with metastases in the liver.</div>",
                },
            }],
        });

        await createTestComposition(context, {
            status: "final",
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consult note",
                }],
            },
            subject: { reference: `Patient/${patient.id}` },
            sections: [{
                title: "Bone Metastases",
                text: {
                    status: "generated",
                    div: "<div>Patient shows signs of metastatic growth in the bones.</div>",
                },
            }],
        });

        await createTestComposition(context, {
            status: "final",
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consult note",
                }],
            },
            subject: { reference: `Patient/${patient.id}` },
            sections: [{
                title: "Lung Examination",
                text: {
                    status: "generated",
                    div: "<div>No signs of metastases in the lungs.</div>",
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Composition?section:text=(bone OR liver) and metastases`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process advanced text search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find two compositions matching the advanced text search",
        );

        for (const entry of bundle.entry) {
            const composition = entry.resource as Composition;
            assertTrue(
                composition.section?.some((section) =>
                    (section.title?.toLowerCase().includes("liver") ||
                        section.title?.toLowerCase().includes("bone")) &&
                    section.text?.div?.toLowerCase().includes("metastases")
                ),
                "Each found composition should have a section about liver or bone metastases",
            );
        }
    });

    // ... (keep the rest of the tests as they are)
}
