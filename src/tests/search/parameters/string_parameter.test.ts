// tests/search/parameters/string_parameter.test.ts

import {
    assertEquals,
    assertExists,
    beforeEach,
    describe,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    getTestPatientCurrentIdentifier,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runStringParameterTests(context: ITestContext) {
    it("Should perform case-insensitive search", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["eve"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given=eve&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process case-insensitive search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry!.length,
            2,
            "Should find 2 patients with case-insensitive 'eve'",
        );
    });

    it("Should perform accent-insensitive search", async () => {
        await createTestPatient(context, { name: [{ given: ["René"] }] });
        await createTestPatient(context, { name: [{ given: ["Rene"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given=rene&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process accent-insensitive search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 patients with accent-insensitive 'rene'",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle simple name search correctly", async () => {
            // Setup
            const names = ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"];
            for (const name of names) {
                await createTestPatient(context, {
                    name: [{ given: [name] }],
                });
            }

            // Test
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?given=mary`,
            });

            // Assertions
            assertEquals(
                response.status,
                200,
                'Server should handle search term "mary" correctly',
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                'Should find 3 patients for search term "mary"',
            );
        });
    }

    if (context.isHapiBugsDisallowed()) {
        it("Should handle compound name search correctly", async () => {
            // Setup
            const names = ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"];
            for (const name of names) {
                await createTestPatient(context, {
                    name: [{ given: [name] }],
                });
            }

            // Test
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?given=mary-ann`,
            });

            // Assertions
            assertEquals(
                response.status,
                200,
                'Server should handle search term "mary-ann" correctly',
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry!.length,
                2,
                'Should find 2 patients for search term "mary-ann"',
            );
        });
    }

    it("Should handle search for non-existent compound name", async () => {
        // Setup
        const names = ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"];
        for (const name of names) {
            await createTestPatient(context, {
                name: [{ given: [name] }],
            });
        }

        // Test
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?given=maryann`,
        });

        // Assertions
        assertEquals(
            response.status,
            200,
            'Server should handle search term "maryann" correctly',
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry!.length,
            1,
            'Should find 1 patient for search term "maryann"',
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle partial name search correctly", async () => {
            // Setup
            const names = ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"];
            for (const name of names) {
                await createTestPatient(context, {
                    name: [{ given: [name] }],
                });
            }

            // Test
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?given=ann`,
            });

            // Assertions
            assertEquals(
                response.status,
                200,
                'Server should handle search term "ann" correctly',
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry!.length,
                3,
                'Should find 3 patients for search term "ann"',
            );
        });
    }

    it("Should handle search for name with hyphen correctly", async () => {
        // Setup
        const names = ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"];
        for (const name of names) {
            await createTestPatient(context, {
                name: [{ given: [name] }],
            });
        }

        // Test
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given=anna&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        // Assertions
        assertEquals(
            response.status,
            200,
            'Server should handle search term "anna" correctly',
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry!.length,
            1,
            'Should find 1 patient for search term "anna"',
        );
    });

    it("Should match strings starting with the search parameter", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });
        await createTestPatient(context, { name: [{ given: ["Steve"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given=eve&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should match strings starting with the search parameter",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry!.length,
            2,
            "Should find 2 patients with names starting with 'eve'",
        );
    });

    it("Should use :contains modifier to match anywhere in the string", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });
        await createTestPatient(context, { name: [{ given: ["Steve"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given:contains=eve&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should use :contains modifier correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry!.length,
            3,
            "Should find 3 patients with 'eve' anywhere in the name",
        );
    });

    it("Should use :exact modifier for exact matching", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?given:exact=Eve&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should use :exact modifier correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with exactly 'Eve'",
        );
    });

    it("Should search on complex elements (HumanName)", async () => {
        await createTestPatient(context, {
            name: [{ given: ["John"], family: "Doe" }],
        });
        await createTestPatient(context, {
            name: [{ given: ["Jane"], family: "Doe" }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?name=doe&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should search on complex elements correctly",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 patients with 'Doe' in any part of the name",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should search family name parts independently", async () => {
            await createTestPatient(context, {
                name: [{ family: "Carreno Quinones" }],
            });

            const response1 = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?family=carreno`,
            });

            const response2 = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?family=quinones`,
            });

            assertEquals(
                response1.status,
                200,
                "Server should search family name parts independently",
            );
            assertEquals(
                response2.status,
                200,
                "Server should search family name parts independently",
            );
            const bundle1 = response1.jsonBody as Bundle;
            const bundle2 = response2.jsonBody as Bundle;
            assertExists(bundle1.entry, "Bundle should contain entries");
            assertExists(bundle2.entry, "Bundle should contain entries");
            assertEquals(
                bundle1.entry.length,
                1,
                "Should find 1 patient with 'Carreno' in family name",
            );
            assertEquals(
                bundle2.entry.length,
                1,
                "Should find 1 patient with 'Quinones' in family name",
            );
        });
    }
}
