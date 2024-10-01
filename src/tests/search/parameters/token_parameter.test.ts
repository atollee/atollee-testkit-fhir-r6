// tests/search/parameters/token_parameter.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runTokenParameterTests(context: ITestContext) {
    it("Should search by identifier with system and code", async () => {
        await createTestPatient(context, {
            identifier: [{
                system: "http://acme.org/patient",
                value: "2345",
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=http://acme.org/patient|2345`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process identifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with the specified identifier",
        );
    });

    it("Should search by code without system", async () => {
        await createTestPatient(context, { gender: "male" });
        await createTestPatient(context, { gender: "female" });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?gender=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process code search without system successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with gender 'male'",
        );
    });

    it("Should search using :not modifier", async () => {
        await createTestPatient(context, { gender: "male" });
        await createTestPatient(context, { gender: "female" });
        await createTestPatient(context, {}); // Patient without gender

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?gender:not=male`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :not modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Should find 2 patients without gender 'male'",
        );
    });

    it("Should search in CodeableConcept", async () => {
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://acme.org/conditions/codes",
                    code: "ha125",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Condition?code=http://acme.org/conditions/codes|ha125`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process CodeableConcept search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 condition with the specified code",
        );
    });

    it("Should search using :text modifier", async () => {
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "25064002",
                    display: "Headache",
                }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:text=headache`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :text modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 condition with 'headache' in the code text",
        );
    });

    it("Should search using :in modifier with value set", async () => {
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "363346000",
                }], // Malignant neoplasm of liver
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Condition?code:in=http%3A%2F%2Fsnomed.info%2Fsct%3Ffhir_vs%3Disa%2F126851005`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :in modifier search with value set successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 condition in the specified value set",
        );
    });

    it("Should search using :below modifier", async () => {
        await createTestCondition(context, {
            code: {
                coding: [{
                    system: "http://snomed.info/sct",
                    code: "363346000",
                }], // Malignant neoplasm of liver
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?code:below=126851005`, // Neoplasm of liver
        });

        assertEquals(
            response.status,
            200,
            "Server should process :below modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 condition subsumed by the specified code",
        );
    });

    it("Should search using :of-type modifier for identifiers", async () => {
        await createTestPatient(context, {
            identifier: [{
                type: {
                    coding: [{
                        system: "http://terminology.hl7.org/CodeSystem/v2-0203",
                        code: "MR",
                    }],
                },
                system: "http://hospital.example.org/identifiers/mrn",
                value: "446053",
            }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier:of-type=http://terminology.hl7.org/CodeSystem/v2-0203|MR|446053`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process :of-type modifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with the specified identifier type and value",
        );
    });
}
