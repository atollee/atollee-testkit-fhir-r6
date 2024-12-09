// tests/search/parameters/named_queries.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestComposition,
    createTestEncounter,
    createTestObservation,
    createTestPatient,
    createTestValueSet,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Composition,
    Encounter,
    Observation,
    OperationDefinition,
    Patient,
    ValueSet,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runNamedQueriesTests(context: ITestContext) {
    it("Should execute a named query without additional parameters", async () => {
        const patient = await createTestPatient(context, {});

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}/$everything`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should execute a named query with a specific parameter", async () => {
        const encounter = await createTestEncounter(context, {
            status: "finished",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Encounter/${encounter.id}/$everything`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query with parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should execute a named query with a standard search parameter", async () => {
            const patient = await createTestPatient(context, {});
            const code = uniqueString("test-code");
            const code2 = uniqueString("new-test-code");
            const system = uniqueString("http://example.com/codesystem");

            for (let i = 0; i < 5; i++) {
                await createTestObservation(context, patient.id!, {
                    code,
                    system,
                    effectiveDateTime: new Date(2023, 0, i + 1).toISOString(),
                });
            }

            for (let i = 0; i < 5; i++) {
                await createTestObservation(context, patient.id!, {
                    code: code2,
                    system,
                    effectiveDateTime: new Date(2023, 0, i + 1).toISOString(),
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation/$lastn?code=${system}%7C${code}&max=3`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the named query with standard parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                "Should return the last 3 observations",
            );
        });
    }

    it("Should execute a named query with both specific and standard parameters", async () => {
        const patient = await createTestPatient(context, {});
        const composition = await createTestComposition(context, {
            status: "final",
            subject: { reference: `Patient/${patient.id}` },
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "34133-9",
                    display: "Summarization of episode note",
                }],
            },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Composition/${composition.id}/$document?_format=json`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the named query with multiple parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Composition"
            ),
            "Results should include the Composition resource",
        );
    });

    it("Should handle named query with unordered parameters", async () => {
        const valueSet = await createTestValueSet(context, {
            url: uniqueString("http://example.com/valueset"),
            compose: {
                include: [{
                    system: "http://example.com/codesystem",
                    concept: [
                        { code: "code1", display: "Code 1" },
                        { code: "code2", display: "Code 2" },
                    ],
                }],
            },
        });

        const response1 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet/${valueSet.id}/$expand?_format=json&displayLanguage=en`,
        });

        const response2 = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `ValueSet/${valueSet.id}/$expand?displayLanguage=en&_format=json`,
        });

        assertEquals(
            response1.status,
            200,
            "Server should process the first query successfully",
        );
        assertEquals(
            response2.status,
            200,
            "Server should process the second query successfully",
        );

        const expandedValueSet1 = response1.jsonBody as ValueSet;
        const expandedValueSet2 = response2.jsonBody as ValueSet;

        assertEquals(
            expandedValueSet1.expansion?.contains?.length,
            expandedValueSet2.expansion?.contains?.length,
            "Both queries should return the same number of expanded concepts",
        );
    });

    if (context.isExpandOperationSupported()) {
        it("Should return OperationDefinition for named query", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `OperationDefinition/$expand`,
            });

            assertEquals(
                response.status,
                200,
                "Server should return the OperationDefinition successfully",
            );
            const operationDefinition = response
                .jsonBody as OperationDefinition;
            assertEquals(
                operationDefinition.resourceType,
                "OperationDefinition",
                "Returned resource should be an OperationDefinition",
            );
            assertEquals(
                operationDefinition.code,
                "expand",
                "OperationDefinition should have the correct code",
            );
            assertEquals(
                operationDefinition.kind,
                "operation",
                "OperationDefinition should be of kind 'operation'",
            );
        });
    }

    it("Should not allow invoking named query via search endpoint", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_query=$everything`,
            method: "GET",
        });

        assertEquals(
            response.status,
            400,
            "Server should reject invoking named query via search endpoint",
        );
    });
}
