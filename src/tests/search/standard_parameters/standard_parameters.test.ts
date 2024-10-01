// tests/search/parameters/standard_parameters.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { Bundle, CapabilityStatement } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runStandardParametersTests(_context: ITestContext) {
    it("Should support standard search parameters listed in the specification", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                "Patient?_lastUpdated=gt2020-01-01&_profile=http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request with standard parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should support all permitted modifiers for base SearchParameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name:exact=John&address:contains=Main",
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request with modifiers successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should make locally-defined SearchParameters available", async () => {
        const capabilityStatementResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(
            capabilityStatementResponse.status,
            200,
            "Server should return CapabilityStatement",
        );
        const capabilityStatement = capabilityStatementResponse
            .jsonBody as CapabilityStatement;

        const searchParameterResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "SearchParameter",
        });

        assertEquals(
            searchParameterResponse.status,
            200,
            "Server should return SearchParameters",
        );
        const searchParameterBundle = searchParameterResponse
            .jsonBody as Bundle;

        // Check if locally-defined SearchParameters are available either as resources or in CapabilityStatement
        const hasLocalSearchParameters = (searchParameterBundle.entry &&
            searchParameterBundle.entry.length > 0) ||
            (capabilityStatement.contained &&
                capabilityStatement.contained.some((resource) =>
                    resource.resourceType === "SearchParameter"
                ));

        assertTrue(
            hasLocalSearchParameters,
            "Locally-defined SearchParameters should be available",
        );
    });
}
