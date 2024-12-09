// tests/search/parameters/implicit_resources.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import { createTestCodeSystem } from "../../utils/resource_creators.ts";
import { Bundle, CodeSystem } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runImplicitResourcesTests(context: ITestContext) {
    it("Should find explicit CodeSystem resources", async () => {
        const uniqueName = uniqueString("TestCodeSystem");
        const codeSystem = await createTestCodeSystem(context, {
            name: uniqueName,
            url: `http://example.com/fhir/CodeSystem/${uniqueName}`,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `CodeSystem?name=${uniqueName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as CodeSystem).id === codeSystem.id
            ),
            "Results should include the created explicit CodeSystem",
        );
    });
    
    it("Should handle search for created CodeSystem resources", async () => {
        // Create a unique CodeSystem
        const uniqueUrl = uniqueString(
            "http://example.com/fhir/CodeSystem/test",
        );
        const uniqueName = uniqueString("TestCodeSystem");

        await createTestCodeSystem(context, {
            name: uniqueName,
            url: uniqueUrl,
            status: "active",
            content: "complete",
            identifier: [{ value: uniqueString("identifier") }],
        });

        // Search for the created CodeSystem
        const response = await fetchSearchWrapper({
            authorized: true,
            method: "GET",
            relativeUrl: `CodeSystem?url=${encodeURIComponent(uniqueUrl)}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Check if the created CodeSystem is included in the results
        const foundCodeSystem = bundle.entry?.find((entry) =>
            (entry.resource as CodeSystem).url === uniqueUrl
        );

        assertExists(
            foundCodeSystem,
            "Created CodeSystem should be found in search results",
        );

        const codeSystem = foundCodeSystem.resource as CodeSystem;
        assertEquals(
            codeSystem.url,
            uniqueUrl,
            "Found CodeSystem should have the correct URL",
        );
        assertEquals(
            codeSystem.name,
            uniqueName,
            "Found CodeSystem should have the correct name",
        );
        assertEquals(
            codeSystem.status,
            "active",
            "Found CodeSystem should have the correct status",
        );
        assertEquals(
            codeSystem.content,
            "complete",
            "Found CodeSystem should have the correct content",
        );
        assertExists(
            codeSystem.concept,
            "Found CodeSystem should have concepts",
        );
        assertEquals(
            codeSystem.concept[0].code,
            "test-code",
            "Found CodeSystem should have the correct concept code",
        );
    });

    if (context.isImplicitCodeSystemSearchSupported()) {
        it("Should handle search for implicit CodeSystem resources", async () => {
            const implicitSystemUrl = "http://hl7.org/fhir/resource-types";
            const implicitResponse = await fetchWrapper({
                authorized: true,
                method: "GET",
                relativeUrl: `CodeSystem?url=${
                    encodeURIComponent(implicitSystemUrl)
                }`,
            });
    
            assertEquals(
                implicitResponse.status,
                200,
                "Server should process the search for implicit CodeSystem successfully",
            );
            const implicitBundle = implicitResponse.jsonBody as Bundle;
            assertExists(implicitBundle.entry, "Bundle should contain entries");
    
            const implicitCodeSystem = implicitBundle.entry?.find((entry) =>
                (entry.resource as CodeSystem).url === implicitSystemUrl
            );
    
            assertEquals(
                (implicitCodeSystem?.resource as CodeSystem).url,
                implicitSystemUrl,
                "Implicit CodeSystem should have the correct URL",
            );
            assertEquals(
                (implicitCodeSystem?.resource as CodeSystem).name,
                "AdministrativeGender",
                "Implicit CodeSystem should have the correct name",
            );
        });
    }


    if (context.isFullTextSearchSupported()) {
        it("Should handle search including both explicit and implicit CodeSystem resources", async () => {
            const uniqueName = uniqueString("TestCodeSystem");
            const explicitCodeSystem = await createTestCodeSystem(context, {
                name: uniqueName,
                url: `http://example.com/fhir/CodeSystem/${uniqueName}`,
            });

            const implicitSystemUrl =
                "http://hl7.org/fhir/administrative-gender";

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `CodeSystem?_content=${uniqueName},AdministrativeGender`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");

            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as CodeSystem).id === explicitCodeSystem.id
                ),
                "Results should include the created explicit CodeSystem",
            );

            const implicitCodeSystem = bundle.entry?.find((entry) =>
                (entry.resource as CodeSystem).url === implicitSystemUrl
            );

            if (implicitCodeSystem) {
                assertEquals(
                    (implicitCodeSystem.resource as CodeSystem).url,
                    implicitSystemUrl,
                    "Implicit CodeSystem should have the correct URL if included",
                );
            } else {
                console.log(
                    "Note: Implicit CodeSystem not included in search results. This is allowed behavior.",
                );
            }
        });
    }
}
