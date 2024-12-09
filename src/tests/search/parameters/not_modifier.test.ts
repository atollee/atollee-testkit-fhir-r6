// tests/search/parameters/not_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
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

        const response = await fetchSearchWrapper({
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

    it("Should handle not modifier correctly and warn about multiple values", async () => {
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

        // Single value not modifier - this is valid
        const singleResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:not=male`,
        });

        assertEquals(
            singleResponse.status,
            200,
            "Server should process search with not modifier for single value successfully",
        );
        const singleBundle = singleResponse.jsonBody as Bundle;
        assertExists(singleBundle.entry, "Bundle should contain entries");

        // Check that no returned patients have gender "male"
        for (const entry of singleBundle.entry) {
            const patient = entry.resource as Patient;
            assertNotEquals(
                patient.gender,
                "male",
                "Patient gender should not be male",
            );
        }

        // Multiple values with not modifier - this should either:
        // 1. Return an error (preferred)
        // 2. Or come with a warning that the results might be unexpected
        const multiResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&gender:not=male,female`,
        });

        // Server should either return an error
        if (multiResponse.status === 400) {
            // This is the preferred behavior
            assertTrue(
                true,
                "Server correctly rejects multiple values with not modifier",
            );
        } else {
            // Or if it returns results, it should return ALL records
            // because of how the union of not(male) OR not(female) works
            assertEquals(
                multiResponse.status,
                200,
                "Server accepts multiple values but results may be unexpected",
            );
            const multiBundle = multiResponse.jsonBody as Bundle;
            assertExists(multiBundle.entry, "Bundle should contain entries");
            assertEquals(
                multiBundle.entry.length,
                5,
                "Should return all patients due to the union behavior of not with multiple values",
            );
        }

        // The correct way to find patients that are neither male nor female
        // would be to use two separate not conditions:
        const correctResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${familyName}&gender:not=male&gender:not=female`,
        });

        assertEquals(
            correctResponse.status,
            200,
            "Server should process multiple not modifiers correctly",
        );
        const correctBundle = correctResponse.jsonBody as Bundle;
        assertExists(correctBundle.entry, "Bundle should contain entries");

        for (const entry of correctBundle.entry) {
            const patient = entry.resource as Patient;
            assertTrue(
                patient.gender !== "male" && patient.gender !== "female",
                `Patient gender should not be male or female: ${patient.gender}`,
            );
        }
    });

    it("Should handle not modifier with token search parameters", async () => {
        const familyName = uniqueString("TestFamily");

        // Create test communication instead since it has a proper token with system+code
        const patient = await createTestPatient(context, {
            family: familyName,
        });

        // Create patient communications with explicit system+code
        await createTestPatient(context, {
            family: familyName,
            communication: [{
                language: {
                    coding: [{
                        system: "urn:ietf:bcp:47",
                        code: "en",
                    }],
                },
            }],
        });

        await createTestPatient(context, {
            family: familyName,
            communication: [{
                language: {
                    coding: [{
                        system: "urn:ietf:bcp:47",
                        code: "es",
                    }],
                },
            }],
        });

        // Patient with no communication
        await createTestPatient(context, {
            family: familyName,
        });

        // Test :not with system|code
        const responseWithSystem = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${familyName}&language:not=urn:ietf:bcp:47|en`,
        });

        assertEquals(
            responseWithSystem.status,
            200,
            "Server should handle :not with system|code format",
        );
        const bundleWithSystem = responseWithSystem.jsonBody as Bundle;
        assertEquals(
            bundleWithSystem.entry?.length,
            3,
            "Should find three patients: one with Spanish, two with no language",
        );

        // Test :not with just code
        const responseWithJustCode = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}&language:not=en`,
        });

        assertEquals(
            responseWithJustCode.status,
            200,
            "Server should handle :not with just code",
        );

        const bundleWithJustCode = responseWithJustCode.jsonBody as Bundle;
        assertEquals(
            bundleWithJustCode.entry?.length,
            3,
            "Should find three patients when using just code",
        );

        // Test :not with just system
        const responseWithJustSystem = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${familyName}&language:not=urn:ietf:bcp:47|`,
        });

        assertEquals(
            responseWithJustSystem.status,
            200,
            "Server should handle :not with just system",
        );
        const bundleWithJustSystem = responseWithJustSystem.jsonBody as Bundle;
        assertEquals(
            bundleWithJustSystem.entry?.length,
            2,
            "Should find two patients with no language defined",
        );

        // Verify returned resources
        for (const entry of bundleWithSystem.entry || []) {
            const patient = entry.resource as Patient;
            // Check that none have English language
            assertFalse(
                patient.communication?.some((comm) =>
                    comm.language?.coding?.some((coding) =>
                        coding.system === "urn:ietf:bcp:47" &&
                        coding.code === "en"
                    )
                ),
                "No patients should have English language",
            );
        }
    });

    it("Should correctly apply not modifier to Composition sections", async () => {
        const patient = await createTestPatient(context, {
            family: uniqueString("TestFamily"),
        });

        // Create a composition with an allergies section
        const composition1 = await createTestComposition(context, {
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
        const composition2 = await createTestComposition(context, {
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
        const composition3 = await createTestComposition(context, {
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
