// tests/search/parameters/max_results.test.ts

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
import { ITestContext } from "../../types.ts";

export function runMaxResultsTests(context: ITestContext) {
    if (context.isMaxResultsSearchParameterSupported()) {
        it("Should limit the total number of returned resources based on _maxresults", async () => {
            const patientCount = 20;
            for (let i = 0; i < patientCount; i++) {
                await createTestPatient(context, {
                    name: [{ given: [`TestPatient${i}`] }],
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_maxresults=10`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length <= 10,
                "Number of entries should not exceed _maxresults",
            );
            assertEquals(
                bundle.total,
                patientCount,
                "Total count should match the total number of patients",
            );
        });

        it("Should include _maxresults in the Self Link", async () => {
            const patientCount = 15;
            for (let i = 0; i < patientCount; i++) {
                await createTestPatient(context, {
                    name: [{ given: [`TestPatient${i}`] }],
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_maxresults=10`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.link, "Bundle should contain links");
            const selfLink = bundle.link.find((link) =>
                link.relation === "self"
            );
            assertExists(selfLink, "Bundle should contain a self link");
            assertTrue(
                selfLink.url.includes("_maxresults=10"),
                "Self link should include the _maxresults parameter",
            );
        });

        it("Should return only the latest resource when using _sort and _maxresults=1", async () => {
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
                    `Observation?subject=${patient.id}&_sort=-date&_maxresults=1`,
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

        if (context.isHapiBugsDisallowed()) {
            it("Should respect paging requirements when using _maxresults and _count", async () => {
                const patientCount = 20;
                for (let i = 0; i < patientCount; i++) {
                    await createTestPatient(context, {
                        name: [{ given: [`TestPatient${i}`] }],
                    });
                }

                const firstResponse = await fetchSearchWrapper({
                    authorized: true,
                    relativeUrl: `Patient?_maxresults=10&_count=5`,
                });

                assertEquals(
                    firstResponse.status,
                    200,
                    "Server should process the first search successfully",
                );
                const firstBundle = firstResponse.jsonBody as Bundle;
                assertExists(
                    firstBundle.entry,
                    "First bundle should contain entries",
                );
                assertEquals(
                    firstBundle.entry.length,
                    5,
                    "First page should contain 5 entries",
                );

                assertExists(
                    firstBundle.link,
                    "First bundle should contain links",
                );
                const nextLink = firstBundle.link.find((link) =>
                    link.relation === "next"
                );
                assertExists(
                    nextLink,
                    "First bundle should contain a next link",
                );

                const secondResponse = await fetchSearchWrapper({
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
                    5,
                    "Second page should contain 5 entries",
                );

                const thirdResponse = await fetchSearchWrapper({
                    authorized: true,
                    relativeUrl: secondBundle.link!.find((link) =>
                        link.relation === "next"
                    )!.url,
                });

                assertEquals(
                    thirdResponse.status,
                    200,
                    "Server should process the third search successfully",
                );
                const thirdBundle = thirdResponse.jsonBody as Bundle;
                assertEquals(
                    thirdBundle.entry,
                    undefined,
                    "Third bundle should not contain any entries due to _maxresults limit",
                );
            });
        }
    }
}
