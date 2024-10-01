// tests/search/parameters/special_parameters.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestComposition,
    createTestLocation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSpecialParameterTests(context: ITestContext) {
    it("Should search using _filter parameter", async () => {
        await createTestPatient(context, {
            gender: "male",
            birthDate: "1990-01-01",
        });
        await createTestPatient(context, {
            gender: "female",
            birthDate: "1995-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_filter=gender eq 'male' and birthdate ge 1990-01-01`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _filter search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient matching the filter criteria",
        );
    });

    it("Should search Composition using section-text parameter", async () => {
        const patientRef = {
            reference: `Patient/${context.getValidPatientId()}`,
        };

        await createTestComposition(context, {
            status: "final",
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consult note",
                }],
            },
            subject: patientRef,
            sections: [{
                title: "History",
                text: {
                    status: "generated",
                    div: '<div xmlns="http://www.w3.org/1999/xhtml">Patient has a history of hypertension.</div>',
                },
            }],
        });

        await createTestComposition(context, {
            status: "final",
            type: {
                coding: [{
                    system: "http://loinc.org",
                    code: "11488-4",
                    display: "Consult note",
                }],
            },
            subject: patientRef,
            sections: [{
                title: "Medications",
                text: {
                    status: "generated",
                    div: '<div xmlns="http://www.w3.org/1999/xhtml">Patient is on lisinopril for hypertension.</div>',
                },
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Composition?section-text=hypertension`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process section-text search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 compositions containing 'hypertension' in section text",
        );
    });

    it("Should search Location using contains parameter", async () => {
        await createTestLocation(context, { address: { city: "New York" } });
        await createTestLocation(context, { address: { city: "Los Angeles" } });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Location?contains=New York`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process contains search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 location containing 'New York'",
        );
    });

    it("Should search Location using near parameter", async () => {
        await createTestLocation(context, {
            position: { latitude: 40.7128, longitude: -74.0060 },
        }); // New York City
        await createTestLocation(context, {
            position: { latitude: 34.0522, longitude: -118.2437 },
        }); // Los Angeles

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Location?near=40.7128|-74.0060|100|km`, // Within 100km of New York City
        });

        assertEquals(
            response.status,
            200,
            "Server should process near search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 location near the specified coordinates",
        );
    });
}
