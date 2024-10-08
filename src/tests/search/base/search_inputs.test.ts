// tests/search/search_inputs.test.ts

import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { CONFIG } from "../../config.ts";

export function runSearchInputTests(context: ITestContext) {
    /*
    it("Should find a resource when filtering across all resources with _id", async () => {
        // Create a test patient
        const patient = await createTestPatient(context, {
            family: "TestPatient",
        });

        // Search using _id at the _search endpoint
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `_id=${patient.id}`,
        });

        assertEquals(response.status, 200, "Response status should be 200");
        assertEquals(response.success, true, "Request should be successful");

        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.total,
            1,
            "Bundle should contain exactly one result",
        );

        const returnedResource = bundle.entry?.[0].resource;
        assertExists(returnedResource, "Returned resource should exist");
        assertEquals(
            returnedResource.resourceType,
            "Patient",
            "Returned resource should be a Patient",
        );
        assertEquals(
            returnedResource.id,
            patient.id,
            "Returned patient id should match the created patient id",
        );
    });

    it("Should return an empty bundle when filtering across all resources with non-existent _id", async () => {
        const nonExistentResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `_id=non-existent-id-${Date.now()}`,
        });

        assertEquals(
            nonExistentResponse.status,
            200,
            "Response status should be 200 even for non-existent id",
        );
        assertEquals(
            nonExistentResponse.success,
            true,
            "Request should be successful even for non-existent id",
        );

        const emptyBundle = nonExistentResponse.jsonBody as Bundle;
        assertEquals(
            emptyBundle.total,
            0,
            "Bundle should contain no results for non-existent id",
        );
    });
    */
    it("Filter on specific resource (Patient.birthDate)", async () => {
        await createTestPatient(context, {
            family: "OldPatient",
            birthDate: "1950-01-01",
        });
        const youngPatient = await createTestPatient(context, {
            family: "YoungPatient",
            birthDate: "2000-01-02",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=gt2000-01-01`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 1);
        assertEquals(bundle.entry?.[0].resource?.id, youngPatient.id);
    });

    if (context.isTextContentSearchSupported()) {
        it("Textual search across resource", async () => {
            const patient = await createTestPatient(context, {
                family: "UniqueNameForSearch",
            });
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_content=UniqueNameForSearch`,
            });

            assertEquals(response.success, true);
            const bundle = response.jsonBody as Bundle;
            assertExists(
                bundle.entry?.find((e) => e.resource?.id === patient.id),
            );
        });
    }

    it("Parameter affecting search results (_sort)", async () => {
        const patient1 = await createTestPatient(context, {
            family: "AaaaPatient",
        });
        const patient2 = await createTestPatient(context, {
            family: "ZzzzPatient",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=family`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry?.[0].resource?.id, patient1.id);
        assertEquals(
            bundle.entry?.[bundle.entry.length - 1].resource?.id,
            patient2.id,
        );
    });

    it("Case sensitivity of search parameters", async () => {
        await createTestPatient(context, {
            family: "CaseSensitiveTest",
        });

        const correctCaseResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=CaseSensitiveTest`,
        });

        const incorrectCaseResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?Family=CaseSensitiveTest`,
        });

        assertEquals(correctCaseResponse.success, true);
        assertEquals(incorrectCaseResponse.success, false);
    });

    it("Order of operations (filters, sort, paging, includes)", async () => {
        const patient1 = await createTestPatient(context, {
            family: "TestPatient1",
        });
        const patient2 = await createTestPatient(context, {
            family: "TestPatient2",
        });
        await createTestObservation(context, patient1.id!, { value: 100 });
        await createTestObservation(context, patient2.id!, { value: 200 });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=15074-8&_sort=-value-quantity&_count=1&_include=Observation:subject`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 2);
        assertEquals(bundle.entry?.length, 2); // 1 Observation + 1 included Patient
        assertEquals(bundle.entry?.[0].resource?.resourceType, "Observation");
        assertEquals(
            (bundle.entry?.[0].resource as Observation).valueQuantity?.value,
            200,
        );
        assertEquals(bundle.entry?.[1].resource?.resourceType, "Patient");
    });

    it("Server returns exact matches and respects _include parameter", async () => {
        const patient = await createTestPatient(context, {
            family: "SearchTestPatient",
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "15074-8",
            value: 100,
        });

        // Search without _include
        const basicResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=15074-8&patient=${patient.id}`,
        });

        assertEquals(
            basicResponse.success,
            true,
            "Search request should be successful",
        );
        const basicBundle = basicResponse.jsonBody as Bundle;
        assertEquals(
            basicBundle.entry?.length,
            1,
            "Should return exactly one matching Observation",
        );
        assertEquals(
            basicBundle.entry?.[0].resource?.id,
            observation.id,
            "Should return the correct Observation",
        );

        // Search with _include
        const includeResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?code=15074-8&patient=${patient.id}&_include=Observation:subject`,
        });

        assertEquals(
            includeResponse.success,
            true,
            "Search with _include should be successful",
        );
        const includeBundle = includeResponse.jsonBody as Bundle;
        assertTrue(
            includeBundle.entry!.length >= 2,
            "Should return Observation and included Patient",
        );
        assertExists(
            includeBundle.entry?.find((e) =>
                e.resource?.resourceType === "Patient"
            ),
            "Should include the Patient resource",
        );

        const includedPatient = includeBundle.entry?.find((e) =>
            e.resource?.resourceType === "Patient"
        );
        if (includedPatient) {
            assertEquals(
                includedPatient.search?.mode,
                "include",
                "Included Patient should be marked with search mode 'include'",
            );
        }
    });

    it("Absence of search filters returns all records", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            (bundle.entry?.length ?? 0) > 0,
            "Server should return all Patient records",
        );
        if (context.isBundleTotalMandatory()) {
            assertTrue(
                (bundle.total ?? 0) > 0,
                "Server should return all Patient records in Bundle.total",
            );
        }
    });
}
