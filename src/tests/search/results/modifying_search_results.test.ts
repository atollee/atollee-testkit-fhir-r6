// tests/search/parameters/modifying_search_results.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runModifyingSearchResultsTests(context: ITestContext) {
    it("Should limit the number of results per page using _count", async () => {
        // Create multiple patients
        for (let i = 0; i < 5; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=3`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _count successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain exactly 3 entries",
        );
    });

    it("Should return only specified elements using _elements", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_elements=name,gender`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _elements successfully",
        );
        const returnedPatient = response.jsonBody as Patient;
        assertExists(returnedPatient.name, "Returned Patient should have name");
        assertExists(
            returnedPatient.gender,
            "Returned Patient should have gender",
        );
        assertEquals(
            returnedPatient.birthDate,
            undefined,
            "Returned Patient should not have birthDate",
        );
    });

    it("Should include referenced resources using _include", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_id=${observation.id}&_include=Observation:subject`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _include successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (Observation and Patient)",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Patient"
            ),
            "Bundle should include a Patient resource",
        );
    });

    it("Should include resources with reverse references using _revinclude", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_id=${patient.id}&_revinclude=Observation:subject`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _revinclude successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (Patient and Observation)",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Observation"
            ),
            "Bundle should include an Observation resource",
        );
    });

    it("Should sort results using _sort", async () => {
        await createTestPatient(context, { name: [{ given: ["Alice"] }] });
        await createTestPatient(context, { name: [{ given: ["Bob"] }] });
        await createTestPatient(context, { name: [{ given: ["Charlie"] }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const names = bundle.entry.map((entry) =>
            (entry.resource as Patient).name?.[0].given?.[0]
        );
        assertEquals(
            names,
            names.sort(),
            "Names should be sorted alphabetically",
        );
    });

    it("Should return a summary of resources using _summary", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_summary=true`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _summary successfully",
        );
        const returnedPatient = response.jsonBody as Patient;
        assertExists(returnedPatient.name, "Returned Patient should have name");
        assertEquals(
            returnedPatient.gender,
            undefined,
            "Returned Patient should not have gender",
        );
        assertEquals(
            returnedPatient.birthDate,
            undefined,
            "Returned Patient should not have birthDate",
        );
    });

    it("Should limit total results using _maxresults", async () => {
        // Create multiple patients
        for (let i = 0; i < 10; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_maxresults=5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search with _maxresults successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length <= 5,
            "Bundle should contain 5 or fewer entries",
        );
    });

    it("Should handle multiple occurrences of non-repeatable search result parameters as an error", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=name&_sort=birthDate`,
        });

        assertEquals(
            response.status,
            400,
            "Server should return an error for multiple occurrences of _sort",
        );
    });
}
