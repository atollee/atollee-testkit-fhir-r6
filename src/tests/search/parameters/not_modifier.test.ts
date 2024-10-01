// tests/search/parameters/not_modifier.test.ts

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
import { Bundle, Composition, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runNotModifierTests(context: ITestContext) {
    it("Should find patients with gender not male", async () => {
        const familyName = uniqueString("TestFamily");

        // Create patients with different genders
        await createTestPatient(context, {
            family: familyName,
            gender: "male",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "female",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "other",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "unknown",
        });
        await createTestPatient(context, {
            family: familyName,
            // No gender specified
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:not=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with not modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            4,
            "Should find four patients with gender not male",
        );

        for (const entry of bundle.entry) {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.gender !== "male" && patient.gender !== undefined,
                `Patient gender should not be male: ${patient.gender}`,
            );
        }
    });

    it("Should handle not modifier with multiple values", async () => {
        const familyName = uniqueString("TestFamily");

        // Create patients with different genders
        await createTestPatient(context, {
            family: familyName,
            gender: "male",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "female",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "other",
        });
        await createTestPatient(context, {
            family: familyName,
            gender: "unknown",
        });
        await createTestPatient(context, {
            family: familyName,
            // No gender specified
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:not=male,female`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with not modifier and multiple values successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Should find three patients with gender not male or female",
        );

        for (const entry of bundle.entry) {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.gender !== "male" && patient.gender !== "female",
                `Patient gender should not be male or female: ${patient.gender}`,
            );
        }
    });

    it("Should reject not modifier on non-token search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate:not=1990-01-01`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject not modifier on non-token search parameters",
        );
    });

    it("Should handle not modifier with coding search parameters", async () => {
        const familyName = uniqueString("TestFamily");

        // Create patients with different marital statuses
        await createTestPatient(context, {
            family: familyName,
            maritalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                    code: "M",
                }],
            },
        });
        await createTestPatient(context, {
            family: familyName,
            maritalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                    code: "S",
                }],
            },
        });
        await createTestPatient(context, {
            family: familyName,
            // No marital status specified
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${familyName}&marital-status:not=http://terminology.hl7.org/CodeSystem/v3-MaritalStatus|M`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with not modifier on coding search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find two patients with marital status not married",
        );

        for (const entry of bundle.entry) {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.maritalStatus?.coding?.[0].code !== "M",
                `Patient marital status should not be married: ${
                    patient.maritalStatus?.coding?.[0].code
                }`,
            );
        }
    });
    it("Should correctly apply not modifier to Composition sections", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        // Create a composition with an allergies section
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
                code: {
                    coding: [{
                        system: "http://loinc.org",
                        code: "48765-2",
                        display: "Allergies and adverse reactions",
                    }],
                },
                title: "Allergies and adverse reactions",
            }],
        });

        // Create a composition without an allergies section
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
                code: {
                    coding: [{
                        system: "http://loinc.org",
                        code: "11348-0",
                        display: "History of past illness",
                    }],
                },
                title: "Past Medical History",
            }],
        });

        // Create a composition with multiple sections including allergies
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
            sections: [
                {
                    code: {
                        coding: [{
                            system: "http://loinc.org",
                            code: "11348-0",
                            display: "History of past illness",
                        }],
                    },
                    title: "Past Medical History",
                },
                {
                    code: {
                        coding: [{
                            system: "http://loinc.org",
                            code: "48765-2",
                            display: "Allergies and adverse reactions",
                        }],
                    },
                    title: "Allergies and adverse reactions",
                },
            ],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Composition?subject=${patient.id}&section:not=48765-2`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with not modifier on Composition sections successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find one Composition without allergies section",
        );

        const composition = bundle.entry[0].resource as Composition;
        assertTrue(
            !composition.section?.some((section) =>
                section.code?.coding?.some((coding) =>
                    coding.code === "48765-2"
                )
            ),
            "Found Composition should not have an allergies section",
        );
    });
}
