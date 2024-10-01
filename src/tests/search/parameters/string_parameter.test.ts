// tests/search/parameters/string_parameter.test.ts

import {
    assertEquals,
    assertExists,
    beforeEach,
    describe,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    getTestPatientCurrentIdentifier,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

async function testSearch(
    context: ITestContext,
    given: string[],
    searchTerm: string,
    expectedCount: number,
) {
    for (const givenElement of given) {
        await createTestPatient(context, {
            name: [{ given: [givenElement] }],
        });
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl:
            `Patient?given=${searchTerm}&identifier=${getTestPatientCurrentIdentifier()}`,
    });

    assertEquals(
        response.status,
        200,
        `Server should handle search term "${searchTerm}" correctly`,
    );
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(
        bundle.entry.length,
        expectedCount,
        `Should find ${expectedCount} patients for search term "${searchTerm}"`,
    );
}

export function runStringParameterTests(context: ITestContext) {
    it("Should perform case-insensitive search", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["eve"] }] });

        const response = await fetchWrapper({
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
            bundle.entry.length,
            2,
            "Should find 2 patients with case-insensitive 'eve'",
        );
    });

    it("Should perform accent-insensitive search", async () => {
        await createTestPatient(context, { name: [{ given: ["René"] }] });
        await createTestPatient(context, { name: [{ given: ["Rene"] }] });

        const response = await fetchWrapper({
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

    it("Should handle simple name search correctly", async () => {
        await testSearch(
            context,
            ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"],
            "mary",
            3,
        );
    });

    it("Should handle compound name search correctly", async () => {
        await testSearch(
            context,
            ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"],
            "mary-ann",
            2,
        );
    });

    it("Should handle search for non-existent compound name", async () => {
        await testSearch(
            context,
            ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"],
            "maryann",
            1,
        );
    });

    it("Should handle partial name search correctly", async () => {
        await testSearch(
            context,
            ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"],
            "ann",
            3,
        );
    });

    it("Should handle search for name with hyphen correctly", async () => {
        await testSearch(
            context,
            ["Mary-Ann", "Mary   Ann", "Maryanne", "Anna-Maria"],
            "anna",
            1,
        );
    });

    it("Should match strings starting with the search parameter", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });
        await createTestPatient(context, { name: [{ given: ["Steve"] }] });

        const response = await fetchWrapper({
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
            bundle.entry.length,
            2,
            "Should find 2 patients with names starting with 'eve'",
        );
    });

    it("Should use :contains modifier to match anywhere in the string", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });
        await createTestPatient(context, { name: [{ given: ["Steve"] }] });

        const response = await fetchWrapper({
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
            bundle.entry.length,
            3,
            "Should find 3 patients with 'eve' anywhere in the name",
        );
    });

    it("Should use :exact modifier for exact matching", async () => {
        await createTestPatient(context, { name: [{ given: ["Eve"] }] });
        await createTestPatient(context, { name: [{ given: ["eve"] }] });
        await createTestPatient(context, { name: [{ given: ["Evelyn"] }] });

        const response = await fetchWrapper({
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

        const response = await fetchWrapper({
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

    it("Should search family name parts independently", async () => {
        await createTestPatient(context, {
            name: [{ family: "Carreno Quinones" }],
        });

        const response1 = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=carreno&identifier=${getTestPatientCurrentIdentifier()}`,
        });

        const response2 = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=quinones&identifier=${getTestPatientCurrentIdentifier()}`,
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
