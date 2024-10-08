// tests/search/parameters/paging_and_includes.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
    createTestPractitioner,
} from "../../utils/resource_creators.ts";
import { Bundle, Practitioner } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { CONFIG } from "../../config.ts";

export function runPagingAndIncludesTests(context: ITestContext) {
    if (context.isHapiBugsDisallowed()) {
        it("Should return _include resources on each page", async () => {
            const practitioner = await createTestPractitioner(context, {
                name: { given: ["TestPractitioner"] },
            });
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });

            // Create multiple observations for the patient, all performed by the same practitioner
            const observationCount = 10;
            for (let i = 0; i < observationCount; i++) {
                await createTestObservation(context, patient.id!, {
                    code: `test-code-${i}`,
                    performer: [{
                        reference: `Practitioner/${practitioner.id}`,
                    }],
                });
            }

            // First page
            const firstPageResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?subject=${patient.id}&_include=Observation:performer&_count=5`,
            });

            assertEquals(
                firstPageResponse.status,
                200,
                "Server should process the first page request successfully",
            );
            const firstPageBundle = firstPageResponse.jsonBody as Bundle;
            assertExists(
                firstPageBundle.entry,
                "First page bundle should contain entries",
            );
            assertEquals(
                firstPageBundle.entry.length,
                6,
                "First page bundle should contain 5 Observations and 1 Practitioner",
            );

            const firstPagePractitioner = firstPageBundle.entry.find((entry) =>
                entry.resource?.resourceType === "Practitioner"
            );
            assertExists(
                firstPagePractitioner,
                "First page should include the Practitioner",
            );

            // Get the next page URL
            const nextPageUrl = firstPageBundle.link?.find((link) =>
                link.relation === "next"
            )?.url;
            assertExists(
                nextPageUrl,
                "First page should have a next page link",
            );

            // Second page
            const secondPageResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: nextPageUrl,
            });

            assertEquals(
                secondPageResponse.status,
                200,
                "Server should process the second page request successfully",
            );
            const secondPageBundle = secondPageResponse.jsonBody as Bundle;
            assertExists(
                secondPageBundle.entry,
                "Second page bundle should contain entries",
            );
            assertEquals(
                secondPageBundle.entry.length,
                6,
                "Second page bundle should contain 5 Observations and 1 Practitioner",
            );

            const secondPagePractitioner = secondPageBundle.entry.find((
                entry,
            ) => entry.resource?.resourceType === "Practitioner");
            assertExists(
                secondPagePractitioner,
                "Second page should also include the Practitioner",
            );

            // Verify that the same Practitioner is included on both pages
            assertEquals(
                (firstPagePractitioner?.resource as Practitioner).id,
                (secondPagePractitioner?.resource as Practitioner).id,
                "The same Practitioner should be included on both pages",
            );
        });
    }

    if (context.isHapiBugsDisallowed()) {
        it("Should handle _include with multiple pages and different included resources per page", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });

            // Create multiple observations for the patient, each with a different practitioner
            const observationCount = 10;
            for (let i = 0; i < observationCount; i++) {
                const practitioner = await createTestPractitioner(context, {
                    name: { given: [`TestPractitioner${i}`] },
                });
                await createTestObservation(context, patient.id!, {
                    code: `test-code-${i}`,
                    performer: [{
                        reference: `Practitioner/${practitioner.id}`,
                    }],
                });
            }

            // First page
            const firstPageResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?subject=${patient.id}&_include=Observation:performer&_count=5`,
            });

            assertEquals(
                firstPageResponse.status,
                200,
                "Server should process the first page request successfully",
            );
            const firstPageBundle = firstPageResponse.jsonBody as Bundle;
            assertExists(
                firstPageBundle.entry,
                "First page bundle should contain entries",
            );
            assertEquals(
                firstPageBundle.entry.length,
                10,
                "First page bundle should contain 5 Observations and 5 Practitioners",
            );

            const firstPagePractitioners = firstPageBundle.entry.filter((
                entry,
            ) => entry.resource?.resourceType === "Practitioner");
            assertEquals(
                firstPagePractitioners.length,
                5,
                "First page should include 5 different Practitioners",
            );

            // Get the next page URL
            const nextPageUrl = firstPageBundle.link?.find((link) =>
                link.relation === "next"
            )?.url;
            assertExists(
                nextPageUrl,
                "First page should have a next page link",
            );

            // Second page
            const secondPageResponse = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: nextPageUrl,
            });

            assertEquals(
                secondPageResponse.status,
                200,
                "Server should process the second page request successfully",
            );
            const secondPageBundle = secondPageResponse.jsonBody as Bundle;
            assertExists(
                secondPageBundle.entry,
                "Second page bundle should contain entries",
            );
            assertEquals(
                secondPageBundle.entry.length,
                10,
                "Second page bundle should contain 5 Observations and 5 Practitioners",
            );

            const secondPagePractitioners = secondPageBundle.entry.filter((
                entry,
            ) => entry.resource?.resourceType === "Practitioner");
            assertEquals(
                secondPagePractitioners.length,
                5,
                "Second page should include 5 different Practitioners",
            );

            // Verify that different Practitioners are included on each page
            const firstPagePractitionerIds = new Set(
                firstPagePractitioners.map((p) =>
                    (p.resource as Practitioner).id
                ),
            );
            const secondPagePractitionerIds = new Set(
                secondPagePractitioners.map((p) =>
                    (p.resource as Practitioner).id
                ),
            );
            assertEquals(
                firstPagePractitionerIds.size,
                5,
                "First page should have 5 unique Practitioners",
            );
            assertEquals(
                secondPagePractitionerIds.size,
                5,
                "Second page should have 5 unique Practitioners",
            );

            for (const id of secondPagePractitionerIds) {
                assertTrue(
                    !firstPagePractitionerIds.has(id),
                    "Second page Practitioners should not appear on the first page",
                );
            }
        });
    }
}
