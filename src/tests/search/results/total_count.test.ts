// tests/search/parameters/total_count.test.ts

import {
    assertEquals,
    assertExists,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTotalCountTests(context: ITestContext) {
    it("Should return total count by default", async () => {
        const patientCount = 5;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Bundle should contain a total count");
        assertEquals(
            bundle.total,
            patientCount,
            "Total count should match the number of created patients",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should not return total count when _total=none", async () => {
            const patientCount = 5;
            for (let i = 0; i < patientCount; i++) {
                await createTestPatient(context, {
                    name: [{ given: [`TestPatient${i}`] }],
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_total=none`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.total,
                undefined,
                "Bundle should not contain a total count",
            );
        });
    }

    it("Should return an estimate when _total=estimate", async () => {
        const patientCount = 10;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_total=estimate`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Bundle should contain a total count");
        // We can't assert an exact value for an estimate, but we can check if it's reasonable
        assertNotEquals(bundle.total, 0, "Estimated total should not be zero");
        assertTrue(
            bundle.total <= patientCount * 2,
            "Estimated total should not be unreasonably high",
        );
    });

    it("Should return an accurate count when _total=accurate", async () => {
        const patientCount = 7;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_total=accurate`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Bundle should contain a total count");
        assertEquals(
            bundle.total,
            patientCount,
            "Accurate total count should match the number of created patients",
        );
    });

    it("Should return total count that's different from the number of entries when using _count", async () => {
        const patientCount = 10;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Bundle should contain a total count");
        assertEquals(
            bundle.total,
            patientCount,
            "Total count should match the total number of patients",
        );
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            5,
            "Number of entries should match the _count parameter",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle _total parameter with invalid value", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_total=invalid`,
            });

            assertEquals(
                response.status,
                400,
                "Server should return a 400 Bad Request for invalid _total value",
            );
        });
    }
}
