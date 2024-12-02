// tests/search/parameters/search_parameter_types.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
    createTestStructureDefinition,
    uniqueNumber,
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    Observation,
    StructureDefinition,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { assertTrue } from "../../../../deps.test.ts";

export function runSearchParameterTypeTests(context: ITestContext) {
    it("Should support number search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=8480-6&value-quantity=120`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process number search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Observation",
        );
    });

    it("Should support date search parameter", async () => {
        const birthDate = "1990-01-01";
        await createTestPatient(context, { birthDate });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=${birthDate}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process date search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Patients",
        );
    });

    it("Should support string search parameter", async () => {
        const familyName = "TestStringSearch";
        await createTestPatient(context, { family: familyName });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process string search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
    });

    it("Should support token search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, { code: "8480-6" });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=http://loinc.org|8480-6`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process token search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support reference search parameter", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {});

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process reference search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support composite search parameter", async () => {
        const patient = await createTestPatient(context, {});
        const code = uniqueString("8480-6");
        const value = uniqueNumber();
        await createTestObservation(context, patient.id!, {
            code: code,
            value: value,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code-value-quantity=http://loinc.org|${code}$${value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process composite search parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
    });

    it("Should support quantity search parameter", async () => {
        const patient = await createTestPatient(context, {});
        const testObservation = await createTestObservation(
            context,
            patient.id!,
            {
                code: "8480-6",
                system: "http://loinc.org",
                value: 120,
                unit: "mm[Hg]",
            },
        );

        // Search using the exact quantity
        const exactResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=8480-6&value-quantity=120|http://unitsofmeasure.org|mm[Hg]`,
        });

        assertEquals(
            exactResponse.status,
            200,
            "Server should process exact quantity search parameter successfully",
        );
        const exactBundle = exactResponse.jsonBody as Bundle;
        assertExists(exactBundle.entry, "Bundle should contain entries");
        assertEquals(
            exactBundle.entry.length,
            1,
            "Bundle should contain exactly one matching Observation",
        );
        assertEquals(
            (exactBundle.entry[0].resource as Observation).id,
            testObservation.id,
            "Returned Observation should match the created one",
        );

        // Search using a range
        const rangeResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=8480-6&value-quantity=gt100&value-quantity=lt140`,
        });

        assertEquals(
            rangeResponse.status,
            200,
            "Server should process range quantity search parameter successfully",
        );
        const rangeBundle = rangeResponse.jsonBody as Bundle;
        assertExists(rangeBundle.entry, "Bundle should contain entries");
        assertTrue(
            rangeBundle.entry.length > 0,
            "Bundle should contain matching Observations",
        );
        assertTrue(
            rangeBundle.entry.some((entry) =>
                (entry.resource as Observation).id === testObservation.id
            ),
            "Range search results should include the created Observation",
        );
    });

    it("Should support uri search parameter", async () => {
        // Create unique URLs for our test StructureDefinitions
        const targetUrl = `http://example.com/${
            uniqueString("fhir")
        }/StructureDefinition/Patient`;
        const otherUrl = `http://example.com/${
            uniqueString("fhir")
        }/fhir/StructureDefinition/Observation`;

        // Create a StructureDefinition with the target URL
        const targetStructureDefinition = await createTestStructureDefinition(
            context,
            {
                url: targetUrl,
                name: "TestPatientStructure",
                kind: "resource",
                abstract: false,
                type: "Patient",
                baseDefinition:
                    "http://hl7.org/fhir/StructureDefinition/Patient",
                status: "active",
            },
        );

        // Create another StructureDefinition with a different URL
        await createTestStructureDefinition(context, {
            url: otherUrl,
            name: "TestObservationStructure",
            kind: "resource",
            abstract: false,
            type: "Observation",
            baseDefinition:
                "http://hl7.org/fhir/StructureDefinition/Observation",
            status: "active",
        });

        // Search for the StructureDefinition with the target URL
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `StructureDefinition?url=${
                encodeURIComponent(targetUrl)
            }`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process uri search parameter successfully",
        );

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain exactly one matching StructureDefinition",
        );

        const returnedStructureDefinition = bundle.entry[0]
            .resource as StructureDefinition;
        assertEquals(
            returnedStructureDefinition.url,
            targetUrl,
            "Returned StructureDefinition should have the correct URL",
        );
        assertEquals(
            returnedStructureDefinition.id,
            targetStructureDefinition.id,
            "Returned StructureDefinition should have the correct ID",
        );

        // Perform a search that should return no results
        const nonExistentUrl = `http://example.com/fhir/StructureDefinition/${
            uniqueString("NonExistent")
        }`;
        const noResultResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `StructureDefinition?url=${
                encodeURIComponent(nonExistentUrl)
            }`,
        });

        assertEquals(
            noResultResponse.status,
            200,
            "Server should process uri search parameter with no results successfully",
        );

        const noResultBundle = noResultResponse.jsonBody as Bundle;
        assertEquals(
            noResultBundle.entry?.length ?? 0,
            0,
            "Bundle should contain no entries for non-existent URL",
        );

        console.log("Server successfully handled uri search parameter");
    });

    // Additional tests for modifiers and prefixes
    it("Should support search parameter modifiers", async () => {
        const familyName = "ModifierTest";
        await createTestPatient(context, { family: familyName });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family:exact=${familyName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search parameter with modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain one matching Patient",
        );
    });

    it("Should support search parameter prefixes", async () => {
        const patient = await createTestPatient(context, {});
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?value-quantity=gt100`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search parameter with prefix successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            (bundle.entry?.length ?? 0) > 0,
            "Bundle should contain matching Observations",
        );
    });
}
