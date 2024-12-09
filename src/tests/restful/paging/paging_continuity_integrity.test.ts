// tests/paging_continuity_integrity.test.ts

import {
    fetchSearchWrapper,
    fetchWrapper,
    patchUrl,
} from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import {
    createTestPatient,
    uniqueCharacters,
    updateRandomText,
} from "../../utils/resource_creators.ts";
import { Context } from "https://deno.land/x/oak@14.2.0/mod.ts";

export function runPagingContinuityIntegrityTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();
    it("Paging Continuity - Consistent results across pages", async () => {
        // First, create a set of test patients
        const patientCount = 15;
        const familyName = uniqueCharacters(10);

        const createdPatients: Patient[] = [];
        for (let i = 0; i < patientCount; i++) {
            const createdPatient = await createTestPatient(context, {
                family: familyName,
            });
            createdPatients.push(createdPatient);
        }

        // Perform initial search
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${familyName}&_count=5`,
        });

        assertEquals(
            initialResponse.status,
            200,
            "Initial search should be successful",
        );
        const initialBundle = initialResponse.jsonBody as Bundle;
        assertEquals(
            initialBundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertExists(initialBundle.link, "Bundle should have navigation links");

        const allRetrievedPatients: Patient[] = [
            ...(initialBundle.entry?.map((e) => e.resource as Patient) || []),
        ];

        // Follow 'next' links to get all pages
        let nextLink = initialBundle.link.find((link) =>
            link.relation === "next"
        );
        while (nextLink) {
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: patchUrl(context, nextLink.url),
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "Next page request should be successful",
            );
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            allRetrievedPatients.push(
                ...(nextPageBundle.entry?.map((e) => e.resource as Patient) ||
                    []),
            );
            nextLink = nextPageBundle.link?.find((link) =>
                link.relation === "next"
            );
        }

        // Check if all created patients are retrieved
        assertEquals(
            allRetrievedPatients.length,
            patientCount,
            "All created patients should be retrieved",
        );
        for (const createdPatient of createdPatients) {
            const found = allRetrievedPatients.some((p) =>
                p.id === createdPatient.id
            );
            assertEquals(
                found,
                true,
                `Created patient ${createdPatient.id} should be in the search results`,
            );
        }

        // Clean up: delete created patients
        for (const patient of createdPatients) {
            await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}`,
                method: "DELETE",
            });
        }
    });

    if (context.areTransactionSupported()) {
        it("Paging Integrity - Handling updates during paging", async () => {
            // Create initial set of patients
            const patientCount = 10;
            const createdPatients: Patient[] = [];
            const familyName = uniqueCharacters(10);
            for (let i = 0; i < patientCount; i++) {
                const createdPatient = await createTestPatient(context, {
                    family: familyName,
                });
                createdPatients.push(createdPatient);
            }

            // Perform initial search
            const initialResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient?name=${familyName}&_count=5`,
            });

            assertEquals(
                initialResponse.status,
                200,
                "Initial search should be successful",
            );
            const initialBundle = initialResponse.jsonBody as Bundle;
            assertExists(
                initialBundle.link,
                "Bundle should have navigation links",
            );
            const nextLink = initialBundle.link.find((link) =>
                link.relation === "next"
            );
            assertExists(nextLink, "There should be a next page");

            // Update a patient that should be on the next page
            const patientToUpdate = createdPatients[7]; // This patient should be on the second page
            await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patientToUpdate.id}`,
                method: "PUT",
                body: JSON.stringify({
                    ...patientToUpdate,
                    name: [{
                        family: `TestPagingIntegrity7`,
                        given: ["Updated"],
                    }],
                }),
            });

            // Retrieve the next page

            let nextLinkUrl = nextLink.url!.replace(baseUrl, "");
            if (nextLinkUrl.startsWith("/")) {
                nextLinkUrl = nextLinkUrl.substring(1);
            }
            const nextPageResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: nextLinkUrl,
            });

            assertEquals(
                nextPageResponse.status,
                200,
                "Next page request should be successful",
            );
            const nextPageBundle = nextPageResponse.jsonBody as Bundle;
            nextPageBundle.entry?.find((e) =>
                (e.resource as Patient).id === patientToUpdate.id
            )?.resource as Patient;

            // If the server remembers the result set as it was (approach 1)
            const originalPatient = nextPageBundle.entry?.find((e) =>
                (e.resource as Patient).id === patientToUpdate.id
            )?.resource as Patient;
            assertExists(
                originalPatient,
                "Original patient should still be in the results",
            );
            assertEquals(
                originalPatient.name?.[0].family,
                familyName,
                "Patient should reflect the original state",
            );
        });
    }
}
