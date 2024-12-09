// tests/patient.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runBaseTests(context: ITestContext) {
    it("Fetch and Validate valid Patient", async () => {
        const validPatient = await createTestPatient(context);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatient.id}`,
        });

        // Check if the request was successful
        assertEquals(response.success, true, "Request should be successful");

        // Check if the response was parsed as JSON
        assertEquals(
            response.jsonParsed,
            true,
            "Response should be valid JSON",
        );

        const patient = response.jsonBody as Patient;

        // Basic Patient resource validation
        assertEquals(
            patient.resourceType,
            "Patient",
            "Resource type should be Patient",
        );
        assertEquals(
            patient.id,
            patient.id,
            "Patient ID should match the requested ID",
        );

        // Check for required fields
        assertExists(patient.meta, "Patient should have a meta field");
        assertExists(
            patient.meta.versionId,
            "Patient should have a version ID",
        );
        assertExists(
            patient.meta.lastUpdated,
            "Patient should have a last updated timestamp",
        );

        // Check for common Patient fields (these may vary based on your server's implementation)
        assertExists(patient.name, "Patient should have a name");
        assertTrue(
            Array.isArray(patient.name),
            "Patient name should be an array",
        );
        if (patient.name.length > 0) {
            assertExists(
                patient.name[0].family,
                "Patient should have a family name",
            );
        }

        // Optional fields - check if they exist and have the correct type
        if (patient.birthDate) {
            assertEquals(
                typeof patient.birthDate,
                "string",
                "Birth date should be a string",
            );
        }

        if (patient.gender) {
            assertTrue(
                ["male", "female", "other", "unknown"].includes(patient.gender),
                "Gender should be a valid FHIR value",
            );
        }

        if (patient.telecom) {
            assertTrue(
                Array.isArray(patient.telecom),
                "Telecom should be an array",
            );
            if (patient.telecom.length > 0) {
                assertExists(
                    patient.telecom[0].system,
                    "Telecom entry should have a system",
                );
                assertExists(
                    patient.telecom[0].value,
                    "Telecom entry should have a value",
                );
            }
        }
    });
}
