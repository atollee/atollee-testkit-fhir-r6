// tests/search/parameters/all_resource_parameters.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAllResourceParametersTests(context: ITestContext) {
    it("Should support _content parameter", async () => {
        const uniqueContent = uniqueString("TestContent");
        await createTestPatient(context, { name: [{ text: uniqueContent }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_content=${uniqueContent}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _content parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _filter parameter", async () => {
        const uniqueName = uniqueString("TestName");
        await createTestPatient(context, { name: [{ given: [uniqueName] }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_filter=name eq "${uniqueName}"`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _filter parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _has parameter", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Observation:patient:code=test-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _id parameter", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _id parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain exactly one entry",
        );
    });

    it("Should support _in parameter", async () => {
        // Assuming you have a List resource with the id "test-list" containing some patients
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_in=test-list`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should support _language parameter", async () => {
        // Since language is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the language
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            language: "en",
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_language=en`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _language parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _lastUpdated parameter", async () => {
        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_lastUpdated=gt${new Date().toISOString()}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should support _list parameter", async () => {
        // Assuming you have a List resource with the id "test-list" containing some patients
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_list=test-list`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _list parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should support _profile parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the profile
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                profile: [
                    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                ],
            },
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_profile=http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _profile parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _query parameter", async () => {
        // Assuming you have a custom named query "find-high-risk-patients"
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_query=find-high-risk-patients`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _query parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    it("Should support _security parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the security tag
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                security: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                    code: "R",
                }],
            },
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_security=http://terminology.hl7.org/CodeSystem/v3-Confidentiality|R`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _source parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the source
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: { source: "http://example.com/source" },
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_source=http://example.com/source`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _source parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _tag parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the tag
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                tag: [{ system: "http://example.com/tags", code: "test-tag" }],
            },
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_tag=http://example.com/tags|test-tag`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _tag parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _text parameter", async () => {
        const uniqueText = uniqueString("TestText");
        await createTestPatient(context, { name: [{ text: uniqueText }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?_text=${uniqueText}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _type parameter", async () => {
        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, "test-patient-id", {
            code: "test-code",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_type=Patient,Observation`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _type parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Patient"
            ) &&
                bundle.entry.some((entry) =>
                    entry.resource?.resourceType === "Observation"
                ),
            "Bundle should contain both Patient and Observation resources",
        );
    });
}
