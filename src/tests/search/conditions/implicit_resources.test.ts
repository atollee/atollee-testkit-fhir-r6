// tests/search/parameters/implicit_resources.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
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

        const response = await fetchWrapper({
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

    it("Should handle search for implicit CodeSystem resources", async () => {
        const implicitSystemUrl = "http://hl7.org/fhir/administrative-gender";

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `CodeSystem?url=${
                encodeURIComponent(implicitSystemUrl)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Check if the implicit CodeSystem is included in the results
        const implicitCodeSystem = bundle.entry?.find((entry) =>
            (entry.resource as CodeSystem).url === implicitSystemUrl
        );

        if (implicitCodeSystem) {
            assertEquals(
                (implicitCodeSystem.resource as CodeSystem).url,
                implicitSystemUrl,
                "Implicit CodeSystem should have the correct URL",
            );
            assertEquals(
                (implicitCodeSystem.resource as CodeSystem).name,
                "AdministrativeGender",
                "Implicit CodeSystem should have the correct name",
            );
        } else {
            console.log(
                "Note: Implicit CodeSystem not included in search results. This is allowed behavior.",
            );
        }
    });

    it("Should handle search including both explicit and implicit CodeSystem resources", async () => {
        const uniqueName = uniqueString("TestCodeSystem");
        const explicitCodeSystem = await createTestCodeSystem(context, {
            name: uniqueName,
            url: `http://example.com/fhir/CodeSystem/${uniqueName}`,
        });

        const implicitSystemUrl = "http://hl7.org/fhir/administrative-gender";

        const response = await fetchWrapper({
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
