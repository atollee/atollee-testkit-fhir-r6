// tests/search/search_inputs.test.ts

import { ITestContext } from "../../types.ts";
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
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";

export function runSearchInputTests(context: ITestContext) {
    it("Filter across all resources (_id)", async () => {
        const patient = await createTestPatient(context, {
            family: "TestPatient",
        });
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 1);
        assertEquals(bundle.entry?.[0].resource?.id, patient.id);
    });

    it("Filter on specific resource (Patient.birthDate)", async () => {
        await createTestPatient(context, {
            family: "OldPatient",
            birthDate: "1950-01-01",
        });
        const youngPatient = await createTestPatient(context, {
            family: "YoungPatient",
            birthDate: "2000-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?birthdate=gt2000-01-01`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 1);
        assertEquals(bundle.entry?.[0].resource?.id, youngPatient.id);
    });

    it("Textual search across resource", async () => {
        const patient = await createTestPatient(context, {
            family: "UniqueNameForSearch",
        });
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_content=UniqueNameForSearch`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry?.find((e) => e.resource?.id === patient.id));
    });

    it("Parameter affecting search results (_sort)", async () => {
        const patient1 = await createTestPatient(context, {
            family: "AaaaPatient",
        });
        const patient2 = await createTestPatient(context, {
            family: "ZzzzPatient",
        });

        const response = await fetchWrapper({
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

        const correctCaseResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=CaseSensitiveTest`,
        });

        const incorrectCaseResponse = await fetchWrapper({
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

        const response = await fetchWrapper({
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

    it("Server returns additional relevant results", async () => {
        const patient = await createTestPatient(context, {
            family: "RelevantResultTest",
        });
        await createTestObservation(context, patient.id!, {
            code: "15074-8",
            value: 100,
        });
        await createTestObservation(context, patient.id!, {
            code: "8480-6",
            value: 120,
        }); // systolic blood pressure

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?code=15074-8&patient=${patient.id}`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.total! >= 2,
            "Server should return at least 2 results",
        );
    });

    it("Absence of search filters returns all records", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.total! > 0,
            "Server should return all Patient records",
        );
    });
}
