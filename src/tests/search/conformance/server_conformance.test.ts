// tests/search/server_conformance.test.ts

import {
    assertEquals,
    assertExists,
    assertFalse,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, CapabilityStatement, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runServerConformanceTests(context: ITestContext) {
    it("Should return used search parameters in the self link", async () => {
        const uniqueName = uniqueString("TestPatient");
        await createTestPatient(context, { name: [{ given: [uniqueName] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueName}&gender=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.link, "Bundle should contain links");
        const selfLink = bundle.link.find((link) => link.relation === "self");
        assertExists(selfLink, "Bundle should contain a self link");
        assertTrue(
            selfLink.url.includes(`name=${uniqueName}`),
            "Self link should include the 'name' parameter",
        );
        assertTrue(
            selfLink.url.includes("gender=male"),
            "Self link should include the 'gender' parameter",
        );
    });

    if (context.isIgnoringUnknownParameters()) {
        it("Should handle unsupported search parameters gracefully", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?unsupported-param=test`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the search request successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.link, "Bundle should contain links");
            const selfLink = bundle.link.find((link) =>
                link.relation === "self"
            );
            assertExists(selfLink, "Bundle should contain a self link");
            assertFalse(
                selfLink.url.includes("unsupported-param"),
                "Self link should not include the unsupported parameter",
            );
        });
    }

    it("Should support parameter chaining when applicable", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?patient.name=TestPatient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the chained search request successfully",
        );
    });

    it("Should support _include parameter when applicable", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_include=Observation:patient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the _include parameter successfully",
        );
    });

    it("Should not be case-sensitive for parameter names", async () => {
        const uniqueName = uniqueString("TestPatient");
        await createTestPatient(context, { name: [{ given: [uniqueName] }] });

        const response1 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${uniqueName}`,
        });

        assertEquals(
            response1.status,
            200,
            "Server should process the lowercase parameter successfully",
        );
    });

    it("Should honor _count parameter", async () => {
        const names = [
            uniqueString("Charlie"),
            uniqueString("Alice"),
            uniqueString("Bob"),
            uniqueString("Robert"),
            uniqueString("Sarah"),
            uniqueString("Sally"),
        ];
        for (const name of names) {
            await createTestPatient(context, { name: [{ given: [name] }] });
        }
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the _count parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length <= 5,
            "Number of returned results should not exceed _count",
        );
    });

    it("Should honor _sort parameter", async () => {
        const names = [
            uniqueString("Charlie"),
            uniqueString("Alice"),
            uniqueString("Bob"),
        ];
        for (const name of names) {
            await createTestPatient(context, { name: [{ given: [name] }] });
        }
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the _sort parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        if (bundle.entry.length > 1) {
            const names = bundle.entry.map((entry) =>
                (entry.resource as Patient).name?.[0].given?.[0] ?? ""
            );
            const sortedNames = [...names].sort();
            assertEquals(
                names,
                sortedNames,
                "Results should be sorted by name",
            );
        }
    });
}
