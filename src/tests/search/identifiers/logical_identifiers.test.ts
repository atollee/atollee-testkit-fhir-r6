// tests/search/identifiers/logical_identifiers.test.ts

import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, OperationOutcome, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runLogicalIdentifiersTests(context: ITestContext) {
    it("Should return a bundle when searching by logical id", async () => {
        const patient = await createTestPatient(context, {
            id: `test-logical-id-${Date.now()}`,
            active: true,
        });

        const searchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(
            searchResponse.status,
            200,
            "Server should process logical id search successfully",
        );
        const searchBundle = searchResponse.jsonBody as Bundle;
        assertEquals(
            searchBundle.resourceType,
            "Bundle",
            "Search should return a Bundle",
        );
        assertExists(searchBundle.entry, "Bundle should contain entries");
        assertEquals(
            searchBundle.entry.length,
            1,
            "Should find 1 patient with the specified logical id",
        );
        assertEquals(
            (searchBundle.entry[0].resource as Patient).id,
            patient.id,
            "Found patient should have the correct id",
        );
    });

    it("Should return a bundle even when logical id does not exist", async () => {
        const nonExistentId = `non-existent-id-${Date.now()}`;

        const searchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${nonExistentId}`,
        });

        assertEquals(
            searchResponse.status,
            200,
            "Server should process search for non-existent id successfully",
        );
        const searchBundle = searchResponse.jsonBody as Bundle;
        assertEquals(
            searchBundle.resourceType,
            "Bundle",
            "Search should return a Bundle even for non-existent id",
        );
        assertEquals(
            searchBundle.total,
            0,
            "Bundle should have zero total resources",
        );

        // Check if the bundle includes an OperationOutcome
        const operationOutcome = searchBundle.entry?.find((entry) =>
            entry.resource?.resourceType === "OperationOutcome"
        )?.resource as OperationOutcome;
        if (operationOutcome) {
            assertExists(
                operationOutcome.issue,
                "OperationOutcome should contain issues",
            );
            assertEquals(
                operationOutcome.issue[0].severity,
                "information",
                "OperationOutcome should have information severity",
            );
        }
    });

    it("Should allow additional search criteria with logical id search", async () => {
        const patientActive = await createTestPatient(context, {
            id: `test-logical-id-active-${Date.now()}`,
            active: true,
        });

        const patientInactive = await createTestPatient(context, {
            id: `test-logical-id-inactive-${Date.now()}`,
            active: false,
        });

        const searchResponseActive = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patientActive.id}&active=true`,
        });

        const searchResponseInactive = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patientInactive.id}&active=false`,
        });

        const searchResponseMismatch = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patientActive.id}&active=false`,
        });

        assertEquals(
            searchResponseActive.status,
            200,
            "Server should process search for active patient successfully",
        );
        assertEquals(
            searchResponseInactive.status,
            200,
            "Server should process search for inactive patient successfully",
        );
        assertEquals(
            searchResponseMismatch.status,
            200,
            "Server should process search with mismatched criteria successfully",
        );

        const bundleActive = searchResponseActive.jsonBody as Bundle;
        const bundleInactive = searchResponseInactive.jsonBody as Bundle;
        const bundleMismatch = searchResponseMismatch.jsonBody as Bundle;

        assertEquals(
            bundleActive.entry?.length,
            1,
            "Should find 1 active patient",
        );
        assertEquals(
            bundleInactive.entry?.length,
            1,
            "Should find 1 inactive patient",
        );
        assertEquals(
            bundleMismatch.entry?.length,
            0,
            "Should find 0 patients with mismatched criteria",
        );
    });

    it("Should allow including additional resources in logical id search", async () => {
        const patient = await createTestPatient(context, {
            id: `test-logical-id-${Date.now()}`,
            active: true,
        });

        const searchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}&_include=Patient:link`,
        });

        assertEquals(
            searchResponse.status,
            200,
            "Server should process search with _include successfully",
        );
        const searchBundle = searchResponse.jsonBody as Bundle;
        assertExists(searchBundle.entry, "Bundle should contain entries");
        assertNotEquals(
            searchBundle.entry.length,
            0,
            "Bundle should not be empty",
        );

        // Check if the bundle includes any linked resources
        const linkedResources = searchBundle.entry.filter((entry) =>
            entry.search?.mode === "include"
        );
        if (linkedResources.length > 0) {
            console.log(`Found ${linkedResources.length} linked resources`);
        } else {
            console.log(
                "No linked resources found. This is expected if the patient has no links.",
            );
        }
    });
}
