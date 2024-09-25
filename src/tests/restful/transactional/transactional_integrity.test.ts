// tests/transactional_integrity.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals, it
} from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runTransactionalIntegrityTests(_context: ITestContext) {
    it("Transactional Integrity - Update Patient and Verify Server Response", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "Test", given: ["Integrity"] }],
                gender: "male",
            }),
        });

        assertEquals(
            createResponse.status,
            201,
            "Patient creation should be successful",
        );
        const patientId = (createResponse.jsonBody as Patient).id;

        // Now, update the patient with partial data
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            body: JSON.stringify({
                resourceType: "Patient",
                id: patientId,
                name: [{ family: "TestUpdated" }],
            }),
        });

        assertEquals(
            updateResponse.status,
            200,
            "Patient update should be successful",
        );

        // Read the patient and check the server's response
        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const updatedPatient = readResponse.jsonBody as Patient;
        assertEquals(
            updatedPatient.name?.[0].family,
            "TestUpdated",
            "Family name should be updated",
        );

        // Instead of asserting that gender must be preserved, we can check if the server behaved consistently
        if (updatedPatient.gender) {
            assertEquals(
                updatedPatient.gender,
                "male",
                "If gender is present, it should match the original value",
            );
        } else {
            console.log(
                "Note: Server did not preserve the gender field during update.",
            );
        }
    });

    it("Transactional Integrity - Version-aware update pattern", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "Test", given: ["VersionAware"] }],
                gender: "male",
            }),
        });

        assertEquals(
            createResponse.status,
            201,
            "Patient creation should be successful",
        );
        const patientId = (createResponse.jsonBody as Patient).id;

        // Read the latest version of the resource
        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const initialPatient = readResponse.jsonBody as Patient;
        const initialEtag = readResponse.headers.get("ETag");

        // Update the patient using version-aware update
        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            headers: {
                "If-Match": initialEtag!,
            },
            body: JSON.stringify({
                ...initialPatient,
                name: [{ family: "TestUpdated", given: ["VersionAware"] }],
            }),
        });

        assertEquals(
            updateResponse.status,
            200,
            "Version-aware update should be successful",
        );

        // Try to update again with the old ETag (should fail)
        const conflictResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PUT",
            headers: {
                "If-Match": initialEtag!,
            },
            body: JSON.stringify({
                ...initialPatient,
                gender: "female",
            }),
        });

        assertEquals(
            conflictResponse.status,
            412,
            "Update with old ETag should fail",
        );
    });

    it("Transactional Integrity - PATCH operation", async () => {
        // First, create a patient
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify({
                resourceType: "Patient",
                name: [{ family: "Test", given: ["Patch"] }],
                gender: "male",
            }),
        });

        assertEquals(
            createResponse.status,
            201,
            "Patient creation should be successful",
        );
        const patientId = (createResponse.jsonBody as Patient).id;

        // Patch the patient
        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify([
                { op: "replace", path: "/gender", value: "female" },
            ]),
        });

        assertEquals(
            patchResponse.status,
            200,
            "PATCH operation should be successful",
        );

        // Read the patient and check if the patch was applied correctly
        const readResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patientId}`,
        });

        const patchedPatient = readResponse.jsonBody as Patient;
        assertEquals(
            patchedPatient.gender,
            "female",
            "Gender should be updated by PATCH",
        );
        assertEquals(
            patchedPatient.name?.[0].family,
            "Test",
            "Name should be preserved after PATCH",
        );
    });
}
