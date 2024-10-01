// tests/search/identifiers/searching_identifiers.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    createTestValueSet,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient, ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchingIdentifiersTests(context: ITestContext) {
    it("Should search by logical identifier (Resource.id)", async () => {
        const patient = await createTestPatient(context, {
            name: [{ family: "TestPatient" }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process logical identifier search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with the specified logical identifier",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patient.id,
            "Found patient should have the correct id",
        );
    });

    it("Should search by Identifier-type element", async () => {
        const identifier = {
            system: "http://example.com/identifiers",
            value: "12345",
        };
        await createTestPatient(context, {
            name: [{ family: "TestPatient" }],
            identifier: [identifier],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?identifier=${identifier.system}|${identifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process Identifier-type element search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 patient with the specified identifier",
        );
        const foundPatient = bundle.entry[0].resource as Patient;
        assertEquals(
            foundPatient.identifier?.[0].system,
            identifier.system,
            "Found patient should have the correct identifier system",
        );
        assertEquals(
            foundPatient.identifier?.[0].value,
            identifier.value,
            "Found patient should have the correct identifier value",
        );
    });

    it("Should search by canonical URL for Canonical Resources", async () => {
        const canonicalUrl = "http://example.com/ValueSet/test-value-set";
        await createTestValueSet(context, {
            url: canonicalUrl,
            name: "TestValueSet",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `ValueSet?url=${encodeURIComponent(canonicalUrl)}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process canonical URL search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Should find 1 ValueSet with the specified canonical URL",
        );
        assertEquals(
            (bundle.entry[0].resource as ValueSet).url,
            canonicalUrl,
            "Found ValueSet should have the correct canonical URL",
        );
    });

    it("Should differentiate between logical id and Identifier searches", async () => {
        const logicalId = "test-logical-id";
        const identifierValue = "test-logical-id"; // Same value as logical id
        await createTestPatient(context, {
            id: logicalId,
            name: [{ family: "TestPatient" }],
            identifier: [{
                system: "http://example.com/identifiers",
                value: identifierValue,
            }],
        });

        const logicalIdResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${logicalId}`,
        });

        const identifierResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${identifierValue}`,
        });

        assertEquals(
            logicalIdResponse.status,
            200,
            "Server should process logical id search successfully",
        );
        assertEquals(
            identifierResponse.status,
            200,
            "Server should process identifier search successfully",
        );

        const logicalIdBundle = logicalIdResponse.jsonBody as Bundle;
        const identifierBundle = identifierResponse.jsonBody as Bundle;

        assertEquals(
            logicalIdBundle.entry?.length,
            1,
            "Should find 1 patient with the specified logical id",
        );
        assertEquals(
            identifierBundle.entry?.length,
            1,
            "Should find 1 patient with the specified identifier",
        );

        assertEquals(
            (logicalIdBundle.entry?.[0].resource as Patient).id,
            logicalId,
            "Logical id search should return patient with correct id",
        );
        assertEquals(
            (identifierBundle.entry?.[0].resource as Patient).identifier?.[0]
                .value,
            identifierValue,
            "Identifier search should return patient with correct identifier",
        );
    });
}
