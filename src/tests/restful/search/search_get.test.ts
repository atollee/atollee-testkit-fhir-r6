// tests/search_get.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";

export function runSearchGetTests(context: ITestContext) {
    const baseUrl = context.getBaseUrl();

    it("Search GET - Resource Type", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test",
        });

        assertEquals(
            response.success,
            true,
            "Resource type search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertEquals(
            bundle.entry?.every((e) => e.resource?.resourceType === "Patient"),
            true,
            "All entries should be Patient resources",
        );
    });

    it("Search GET - Compartment (All Contained Resource Types)", async () => {
        // Assuming we have a valid patient ID for the compartment
        const patientId = context.getValidPatientId();
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}/*?_count=5`,
        });

        assertEquals(
            response.success,
            true,
            "Compartment search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
    });

    it("Search GET - Compartment (Specific Resource Type)", async () => {
        // Assuming we have a valid patient ID for the compartment
        const patientId = context.getValidPatientId();
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${patientId}/Observation?code=http://loinc.org|55284-4`,
        });

        assertEquals(
            response.success,
            true,
            "Compartment and resource type search should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertEquals(
            bundle.entry?.every((e) =>
                e.resource?.resourceType === "Observation"
            ),
            true,
            "All entries should be Observation resources",
        );
    });

    it("Search GET - With _format parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test&_format=json",
        });

        assertEquals(
            response.success,
            true,
            "Search with _format parameter should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        assertEquals(
            response.headers.get("Content-Type")?.includes(
                "application/fhir+json",
            ),
            true,
            "Response should be in JSON format",
        );
    });

    it("Search GET - With multiple parameters", async () => {
        for (let i = 0; i < 8; i++) {
            const response = await createTestPatient(context, "Test");
            assertTrue(response, "Patient creation should be successful");
        }
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?name=Test&gender=male&_count=5",
        });

        assertEquals(
            response.success,
            true,
            "Search with multiple parameters should be successful",
        );
        assertEquals(
            response.status,
            200,
            "Should return 200 OK for successful search",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.type,
            "searchset",
            "Response should be a searchset bundle",
        );
        assertEquals(
            (bundle.entry?.length || 0) <= 5,
            true,
            "Should return no more than 5 entries",
        );
    });

    it("Search GET - With invalid parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?invalid_param=value",
        });

        assertEquals(
            response.success,
            false,
            "Search with invalid parameters should fail",
        );
        assertEquals(
            response.status,
            400,
            "Should return 400 Bad Request for invalid parameters",
        );
    });

    it("Search GET - With unsupported _format", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_format=unsupported_format",
        });

        assertEquals(
            response.success,
            false,
            "Search with unsupported _format should fail",
        );
        assertEquals(
            response.status,
            406,
            "Should return 406 Not Acceptable for unsupported _format",
        );
    });

    it("Search GET - Pagination", async () => {
        for (let i = 0; i < 15; i++) {
            const response = await createTestPatient(context, "Test");
            assertTrue(response, "Patient creation should be successful");
        }
        const firstPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=5",
        });

        assertEquals(
            firstPageResponse.success,
            true,
            "First page search should be successful",
        );
        const firstPageBundle = firstPageResponse.jsonBody as Bundle;
        assertExists(
            firstPageBundle.link?.find((link) => link.relation === "next"),
            "Should have a next link for pagination",
        );

        const nextLink = firstPageBundle.link?.find((link) =>
            link.relation === "next"
        )?.url;
        assertExists(nextLink, "Next link should exist");

        const targetBaseUrl = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        const relativeNextLink = nextLink.startsWith(targetBaseUrl)
            ? nextLink.substring(targetBaseUrl.length)
            : nextLink;
        const secondPageResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: relativeNextLink,
        });

        assertEquals(
            secondPageResponse.success,
            true,
            "Second page search should be successful",
        );
        const secondPageBundle = secondPageResponse.jsonBody as Bundle;
        assertExists(
            secondPageBundle.link?.find((link) => link.relation === "previous"),
            "Should have a previous link",
        );
    });

    async function createTestPatient(
        _context: ITestContext,
        family: string,
    ): Promise<Patient> {
        const newPatient: Patient = {
            resourceType: "Patient",
            name: [{ family: family }],
            gender: "male",
            active: false,
            telecom: [{}],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        return response.jsonBody as Patient;
    }
}
