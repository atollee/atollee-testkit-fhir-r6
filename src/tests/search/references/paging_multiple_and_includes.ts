import { assertEquals, assertTrue, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
    uniqueCharacters,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    BundleEntry,
    FhirResource,
    Observation,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runPagingMultipleWithIncludesTests(context: ITestContext) {
    it("Should return paged results with _revinclude respecting server hard limit", async () => {
        const defaultPageSize = context.getDefaultPageSize() || 50;

        const family = `PagingTest${uniqueCharacters(5)}`;
        // Create test patients
        const patient1 = await createTestPatient(context, {
            family: `${family}1`,
        });
        const patient2 = await createTestPatient(context, {
            family: `${family}2`,
        });
        const patient3 = await createTestPatient(context, {
            family: `${family}3`,
        });

        // Patient 1: Create 2.4x page size of Observations
        const patient1Observations = [];
        for (let i = 0; i < Math.floor(defaultPageSize * 2.4); i++) {
            const obs = await createTestObservation(context, patient1.id!, {
                code: "test-code-1",
                value: i,
            });
            patient1Observations.push(obs);
        }

        // Patient 2: Create 0.4x page size of Observations
        const patient2Observations = [];
        for (let i = 0; i < Math.floor(defaultPageSize * 0.4); i++) {
            const obs = await createTestObservation(context, patient2.id!, {
                code: "test-code-2",
                value: i,
            });
            patient2Observations.push(obs);
        }

        // Patient 3: Create 0.2x page size of Observations
        const patient3Observations = [];
        for (let i = 0; i < Math.floor(defaultPageSize * 0.2); i++) {
            const obs = await createTestObservation(context, patient3.id!, {
                code: "test-code-3",
                value: i,
            });
            patient3Observations.push(obs);
        }

        // Helper to identify resources for a patient
        const isResourceForPatient =
            (patientId: string) => (entry: BundleEntry<FhirResource>) => {
                if (entry.resource?.resourceType === "Patient") {
                    return entry.resource.id === patientId;
                }
                if (entry.resource?.resourceType === "Observation") {
                    return (entry.resource as Observation).subject?.reference
                        ?.indexOf(`Patient/${patientId}`) !== -1;
                }
                return false;
            };

        // PAGE 1: Should contain Patient 1 and their first (defaultPageSize-1) observations
        const page1Response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?family=${family}&_revinclude=Observation:subject`,
        });

        assertEquals(
            page1Response.status,
            200,
            "First page request should succeed",
        );
        const page1Bundle = page1Response.jsonBody as Bundle;

        assertEquals(
            page1Bundle.entry?.length,
            defaultPageSize,
            "Page 1 should have exactly defaultPageSize entries",
        );

        // Verify Patient 1 content
        const page1Patient1Resources = page1Bundle.entry!.filter(
            isResourceForPatient(patient1.id!),
        );
        assertEquals(
            page1Patient1Resources.length,
            defaultPageSize,
            `Page 1 should have Patient 1 and ${
                defaultPageSize - 1
            } observations`,
        );
        assertEquals(
            page1Patient1Resources.filter((e) =>
                e.resource?.resourceType === "Patient"
            ).length,
            1,
            "Page 1 should have Patient 1",
        );
        assertEquals(
            page1Patient1Resources.filter((e) =>
                e.resource?.resourceType === "Observation"
            ).length,
            defaultPageSize - 1,
            `Page 1 should have first ${
                defaultPageSize - 1
            } observations of Patient 1`,
        );

        // PAGE 2: Should contain next defaultPageSize observations of Patient 1
        const page2Response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: context.createRelativeUrl(
                page1Bundle.link!.find((l) => l.relation === "next")!.url,
            ),
        });

        assertEquals(
            page2Response.status,
            200,
            "Second page request should succeed",
        );
        const page2Bundle = page2Response.jsonBody as Bundle;

        assertEquals(
            page2Bundle.entry?.length,
            defaultPageSize,
            "Page 2 should have exactly defaultPageSize entries",
        );

        const page2Patient1Observations = page2Bundle.entry!.filter(
            isResourceForPatient(patient1.id!),
        );
        assertEquals(
            page2Patient1Observations.length,
            defaultPageSize,
            `Page 2 should have ${defaultPageSize} observations of Patient 1`,
        );
        assertTrue(
            page2Patient1Observations.every((e) =>
                e.resource?.resourceType === "Observation"
            ),
            "Page 2 should only contain observations",
        );

        // PAGE 3: Should contain remaining Patient 1 observations, Patient 2 and their observations
        const page3Response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: context.createRelativeUrl(
                page2Bundle.link!.find((l) => l.relation === "next")!.url,
            ),
        });

        assertEquals(
            page3Response.status,
            200,
            "Third page request should succeed",
        );
        const page3Bundle = page3Response.jsonBody as Bundle;

        const remainingPatient1Obs = Math.floor(defaultPageSize * 2.4) -
            (2 * defaultPageSize - 1); // two page sizes and one patient
        const page3Patient1Resources = page3Bundle.entry!.filter(
            isResourceForPatient(patient1.id!),
        );
        assertEquals(
            page3Patient1Resources.length,
            remainingPatient1Obs,
            `Page 3 should have last ${remainingPatient1Obs} observations of Patient 1`,
        );

        const page3Patient2Resources = page3Bundle.entry!.filter(
            isResourceForPatient(patient2.id!),
        );
        assertEquals(
            page3Patient2Resources.length,
            Math.floor(defaultPageSize * 0.4) + 1,
            `Page 3 should have Patient 2 and their ${
                Math.floor(defaultPageSize * 0.4)
            } observations`,
        );
        assertEquals(
            page3Patient2Resources.filter((e) =>
                e.resource?.resourceType === "Patient"
            ).length,
            1,
            "Page 3 should have Patient 2",
        );
        assertEquals(
            page3Patient2Resources.filter((e) =>
                e.resource?.resourceType === "Observation"
            ).length,
            Math.floor(defaultPageSize * 0.4),
            `Page 3 should have all ${
                Math.floor(defaultPageSize * 0.4)
            } observations of Patient 2`,
        );

        // PAGE 4: Should contain Patient 3 and their observations
        const page4Response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: context.createRelativeUrl(
                page3Bundle.link!.find((l) => l.relation === "next")!.url,
            ),
        });

        assertEquals(
            page4Response.status,
            200,
            "Fourth page request should succeed",
        );
        const page4Bundle = page4Response.jsonBody as Bundle;

        const page4Patient3Resources = page4Bundle.entry!.filter(
            isResourceForPatient(patient3.id!),
        );
        assertEquals(
            page4Patient3Resources.length,
            Math.floor(defaultPageSize * 0.2) + 1,
            `Page 4 should have Patient 3 and their ${
                Math.floor(defaultPageSize * 0.2)
            } observations`,
        );
        assertEquals(
            page4Patient3Resources.filter((e) =>
                e.resource?.resourceType === "Patient"
            ).length,
            1,
            "Page 4 should have Patient 3",
        );
        assertEquals(
            page4Patient3Resources.filter((e) =>
                e.resource?.resourceType === "Observation"
            ).length,
            Math.floor(defaultPageSize * 0.2),
            `Page 4 should have all ${
                Math.floor(defaultPageSize * 0.2)
            } observations of Patient 3`,
        );

        // Verify no next link on last page
        assertTrue(
            page4Bundle.link?.some((l) => l.relation !== "next"),
            "Last page should not have a next link",
        );

        // Verify total matches (should be 3 patients)
        assertEquals(
            page1Bundle.total,
            3,
            "Total should be count of matching patients",
        );

        // Verify search modes across all pages
        [page1Bundle, page2Bundle, page3Bundle, page4Bundle].forEach(
            (bundle) => {
                bundle.entry!.forEach((entry) => {
                    if (entry.resource?.resourceType === "Patient") {
                        assertEquals(
                            entry.search?.mode,
                            "match",
                            "Patients should have search mode 'match'",
                        );
                    } else if (entry.resource?.resourceType === "Observation") {
                        assertEquals(
                            entry.search?.mode,
                            "include",
                            "Observations should have search mode 'include'",
                        );
                    }
                });
            },
        );
    });
}
