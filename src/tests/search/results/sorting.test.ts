// tests/search/parameters/sorting.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSortingTests(context: ITestContext) {
    it("Should sort results in ascending order", async () => {
        const names = ["Charlie", "Alice", "Bob"];
        for (const name of names) {
            await createTestPatient(context, { name: [{ given: [name] }] });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the ascending sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedNames = bundle.entry.map((entry) =>
            (entry.resource as Patient).name?.[0].given?.[0]
        );
        assertEquals(
            sortedNames,
            ["Alice", "Bob", "Charlie"],
            "Names should be sorted in ascending order",
        );
    });

    it("Should sort results in descending order", async () => {
        const names = ["Charlie", "Alice", "Bob"];
        for (const name of names) {
            await createTestPatient(context, { name: [{ given: [name] }] });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=-name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the descending sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedNames = bundle.entry.map((entry) =>
            (entry.resource as Patient).name?.[0].given?.[0]
        );
        assertEquals(
            sortedNames,
            ["Charlie", "Bob", "Alice"],
            "Names should be sorted in descending order",
        );
    });

    it("Should sort results using multiple sort parameters", async () => {
        const patient1 = await createTestPatient(context, {
            name: [{ given: ["Alice"], family: "Smith" }],
        });
        const patient2 = await createTestPatient(context, {
            name: [{ given: ["Bob"], family: "Smith" }],
        });
        const patient3 = await createTestPatient(context, {
            name: [{ given: ["Alice"], family: "Jones" }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=family,given`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the multiple parameter sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedIds = bundle.entry.map((entry) =>
            (entry.resource as Patient).id
        );
        assertEquals(
            sortedIds,
            [patient3.id, patient1.id, patient2.id],
            "Patients should be sorted by family name then given name",
        );
    });

    it("Should sort date-based resources", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const dates = ["2023-01-01", "2023-03-01", "2023-02-01"];
        for (const date of dates) {
            await createTestObservation(context, patient.id!, {
                effectiveDateTime: date,
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}&_sort=date`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the date sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedDates = bundle.entry.map((entry) =>
            (entry.resource as Observation).effectiveDateTime
        );
        assertEquals(
            sortedDates,
            ["2023-01-01", "2023-02-01", "2023-03-01"],
            "Dates should be sorted in ascending order",
        );
    });

    it("Should sort case-insensitively on string parameters", async () => {
        const names = ["alice", "Bob", "CHARLIE"];
        for (const name of names) {
            await createTestPatient(context, { name: [{ given: [name] }] });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_sort=name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the case-insensitive sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedNames = bundle.entry.map((entry) =>
            (entry.resource as Patient).name?.[0].given?.[0]
        );
        assertEquals(
            sortedNames,
            ["alice", "Bob", "CHARLIE"],
            "Names should be sorted case-insensitively",
        );
    });

    it("Should sort on code parameters", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const codes = ["code3", "code1", "code2"];
        for (const code of codes) {
            await createTestObservation(context, patient.id!, {
                code: code,
                system: "http://example.com/codesystem",
                display: `Display for ${code}`,
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject=${patient.id}&_sort=code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the code sort successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        const sortedCodes = bundle.entry.map((entry) =>
            (entry.resource as Observation).code?.coding?.[0].code
        );
        assertEquals(
            sortedCodes,
            ["code1", "code2", "code3"],
            "Codes should be sorted alphabetically",
        );
    });
}
