// tests/search/parameters/of_type_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runOfTypeModifierTests(context: ITestContext) {
    it("Should find patients with specific identifier type and value", async () => {
        const mrn = uniqueString("12345");
        const tempMrn = uniqueString("67890");

        // Create a patient with a Medical Record Number
        await createTestPatient(context, {
            identifier: [{
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "MR",
                    }],
                },
                system: "http://example.org/ehr-primary/",
                value: mrn,
            }],
        });

        // Create a patient with a Temporary Medical Record Number
        await createTestPatient(context, {
            identifier: [{
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "MRT",
                    }],
                },
                system: "http://example.org/ehr-er/",
                value: tempMrn,
            }],
        });

        // Search for patients with MR identifier
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203|MR|${mrn}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with of-type modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one patient with MR identifier",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertTrue(
            patient.identifier?.some((id) =>
                id.type?.coding?.some((coding) =>
                    coding.system ===
                        "http://terminology.hl7.org/CodeSystem/v2-0203" &&
                    coding.code === "MR"
                ) &&
                id.value === mrn
            ),
            "Found patient should have the correct MR identifier",
        );
    });

    it("Should not find patients with different identifier types", async () => {
        const mrn = uniqueString("12345");

        // Create a patient with a Temporary Medical Record Number
        await createTestPatient(context, {
            identifier: [{
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "MRT",
                    }],
                },
                system: "http://example.org/ehr-er/",
                value: mrn,
            }],
        });

        // Search for patients with MR identifier
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203|MR|${mrn}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            0,
            "Should not find any patients with MR identifier",
        );
    });

    it("Should handle escaped values in of-type modifier", async () => {
        const mrnWithPipe = uniqueString("12345|67890");
        const escapedMrn = mrnWithPipe.replace("|", "\\|");

        // Create a patient with an MRN containing a pipe character
        await createTestPatient(context, {
            identifier: [{
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "MR",
                    }],
                },
                system: "http://example.org/ehr-primary/",
                value: mrnWithPipe,
            }],
        });

        // Search for patients with MR identifier containing escaped pipe
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203|MR|${escapedMrn}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with escaped value successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find exactly one patient with MR identifier containing pipe",
        );

        const patient = bundle.entry[0].resource as Patient;
        assertTrue(
            patient.identifier?.some((id) =>
                id.type?.coding?.some((coding) =>
                    coding.system ===
                        "http://terminology.hl7.org/CodeSystem/v2-0203" &&
                    coding.code === "MR"
                ) &&
                id.value === mrnWithPipe
            ),
            "Found patient should have the correct MR identifier with pipe character",
        );
    });

    it("Should reject of-type modifier on non-token search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name:of-type=http://example.org|NAME|John`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject of-type modifier on non-token search parameters",
        );
    });

    it("Should reject of-type modifier with missing parts", async () => {
        const responses = await Promise.all([
            fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203||12345`,
            }),
            fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203|MR|`,
            }),
            fetchWrapper({
                authorized: true,
                relativeUrl: `Patient?identifier:of-type=|MR|12345`,
            }),
        ]);

        responses.forEach((response) => {
            assertEquals(
                response.status,
                400,
                "Server should reject of-type modifier with missing parts",
            );
        });
    });
}
