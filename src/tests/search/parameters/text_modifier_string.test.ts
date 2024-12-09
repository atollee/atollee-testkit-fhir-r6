import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestComposition,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Composition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTextModifierStringTests(context: ITestContext) {
    if (context.isFullTextSearchSupported()) {
        it("Should perform case-insensitive search", async () => {
            const patient = await createTestPatient(context);

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
                        div: "<div>Patient presents with Liver Metastases.</div>",
                    },
                }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Composition?section:text=LIVER metastases`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process case-insensitive search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Should find one composition despite case differences",
            );
        });

        it("Should match partial words", async () => {
            const patient = await createTestPatient(context);

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
                    title: "Hepatic Metastases",
                    text: {
                        status: "generated",
                        div: "<div>Patient shows signs of hepatic metastases.</div>",
                    },
                }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Composition?section:text=hepat metas`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process partial word search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Should find one composition with partial word matches",
            );
        });

        it("Should handle special characters and accents", async () => {
            const patient = await createTestPatient(context);

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
                    title: "Métastases hépatiques",
                    text: {
                        status: "generated",
                        div: "<div>Le patient présente des métastases hépatiques.</div>",
                    },
                }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Composition?section:text=metastases hepatiques`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process search with special characters successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                1,
                "Should find one composition despite lack of accents in search",
            );
        });

        it("Should support boolean operators", async () => {
            const patient = await createTestPatient(context);

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
                        div: "<div>Patient presents with liver metastases.</div>",
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
                        div: "<div>Patient shows signs of bone metastases.</div>",
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
                        div: "<div>Patient shows lung metastases.</div>",
                    },
                }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Composition?section:text=(liver OR bone) AND metastases NOT lung`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process boolean operator search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Should find two compositions (liver and bone, but not lung)",
            );

            for (const entry of bundle.entry) {
                const composition = entry.resource as Composition;
                assertTrue(
                    composition.section?.some((section) =>
                        (section.title?.toLowerCase().includes("liver") ||
                            section.title?.toLowerCase().includes("bone")) &&
                        !section.title?.toLowerCase().includes("lung")
                    ),
                    "Each found composition should be about liver or bone metastases, but not lung",
                );
            }
        });
    }
}
