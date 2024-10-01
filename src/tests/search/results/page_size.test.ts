// tests/search/parameters/page_size.test.ts

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
import { ITestContext } from "../../types.ts";

export function runPageSizeTests(context: ITestContext) {
    it("Should limit the number of returned resources based on _count", async () => {
        const patientCount = 10;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            5,
            "Number of entries should match the _count parameter",
        );
        assertEquals(
            bundle.total,
            patientCount,
            "Total count should match the total number of patients",
        );
    });

    it("Should not return more resources than requested with _count", async () => {
        const patientCount = 3;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=5`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length <= 5,
            "Number of entries should not exceed the _count parameter",
        );
        assertEquals(
            bundle.total,
            patientCount,
            "Total count should match the total number of patients",
        );
    });

    it("Should return only the latest resource when using _sort and _count=1", async () => {
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
            relativeUrl:
                `Observation?subject=${patient.id}&_sort=-date&_count=1`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Only one resource should be returned",
        );
        assertEquals(
            (bundle.entry[0].resource as Observation).effectiveDateTime,
            "2023-03-01",
            "The latest resource should be returned",
        );
    });

    it("Should return a count-only response when _count=0", async () => {
        const patientCount = 5;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=0`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.total,
            patientCount,
            "Total count should match the total number of patients",
        );
        assertEquals(
            bundle.entry,
            undefined,
            "Bundle should not contain any entries",
        );
        assertEquals(
            bundle.link?.find((link) => link.relation === "next"),
            undefined,
            "Bundle should not contain a next link",
        );
        assertEquals(
            bundle.link?.find((link) => link.relation === "previous"),
            undefined,
            "Bundle should not contain a previous link",
        );
        assertEquals(
            bundle.link?.find((link) => link.relation === "last"),
            undefined,
            "Bundle should not contain a last link",
        );
    });

    it("Should respect _count parameter in subsequent pages", async () => {
        const patientCount = 10;
        for (let i = 0; i < patientCount; i++) {
            await createTestPatient(context, {
                name: [{ given: [`TestPatient${i}`] }],
            });
        }

        const firstResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_count=3`,
        });

        assertEquals(
            firstResponse.status,
            200,
            "Server should process the first search successfully",
        );
        const firstBundle = firstResponse.jsonBody as Bundle;
        assertExists(firstBundle.link, "First bundle should contain links");
        const nextLink = firstBundle.link.find((link) =>
            link.relation === "next"
        );
        assertExists(nextLink, "First bundle should contain a next link");

        const secondResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: nextLink.url,
        });

        assertEquals(
            secondResponse.status,
            200,
            "Server should process the second search successfully",
        );
        const secondBundle = secondResponse.jsonBody as Bundle;
        assertExists(
            secondBundle.entry,
            "Second bundle should contain entries",
        );
        assertEquals(
            secondBundle.entry.length,
            3,
            "Second page should respect the original _count parameter",
        );
    });
}
