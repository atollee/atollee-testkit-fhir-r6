// tests/accepting_other_bundle_types.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";

export function runAcceptingOtherBundleTypesTests(_context: ITestContext) {
    it("Accept History Bundle", async () => {
        const patientId = `history-patient-${Date.now()}`;
        const observationId = `history-obs-${Date.now()}`;
        const historyBundle: Bundle = {
            resourceType: "Bundle",
            type: "history",
            entry: [
                {
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["History"] }],
                    },
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    response: {
                        status: "201",
                        location: `Patient/${patientId}/_history/1`,
                    },
                },
                {
                    resource: {
                        resourceType: "Observation",
                        id: observationId,
                        status: "final",
                        code: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "55284-4",
                            }],
                        },
                        subject: {
                            reference: `Patient/${patientId}`,
                        },
                    },
                    request: {
                        method: "POST",
                        url: "Observation",
                    },
                    response: {
                        status: "201",
                        location: `Observation/${observationId}/_history/1`,
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(historyBundle),
        });

        assertEquals(response.status, 200, "History bundle should be accepted");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "transaction-response",
            "Response should be a transaction-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check Patient entry
        const patientResponse = responseBundle.entry?.[0];
        assertEquals(
            patientResponse?.response?.status,
            "201 Created",
            "Patient should be created",
        );
        assertExists(
            patientResponse?.response?.location,
            "Location should be provided for Patient",
        );
        assertEquals(
            patientResponse?.response?.location?.includes(patientId),
            true,
            "Patient should retain original id",
        );

        // Check Observation entry
        const obsResponse = responseBundle.entry?.[1];
        assertEquals(
            obsResponse?.response?.status,
            "201 Created",
            "Observation should be created",
        );
        assertExists(
            obsResponse?.response?.location,
            "Location should be provided for Observation",
        );
        assertEquals(
            obsResponse?.response?.location?.includes(observationId),
            true,
            "Observation should retain original id",
        );
    });

    it("Accept Collection Bundle", async () => {
        const patientId = `collection-patient-${Date.now()}`;
        const collectionBundle: Bundle = {
            resourceType: "Bundle",
            type: "collection",
            entry: [
                {
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["Collection"] }],
                    },
                },
                {
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "55284-4",
                            }],
                        },
                        subject: {
                            reference: `Patient/${patientId}`,
                        },
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(collectionBundle),
        });

        assertEquals(
            response.status,
            200,
            "Collection bundle should be accepted",
        );
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "transaction-response",
            "Response should be a transaction-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check Patient entry
        const patientResponse = responseBundle.entry?.[0];
        assertEquals(
            patientResponse?.response?.status,
            "201 Created",
            "Patient should be created",
        );
        assertExists(
            patientResponse?.response?.location,
            "Location should be provided for Patient",
        );

        // Check Observation entry
        const obsResponse = responseBundle.entry?.[1];
        assertEquals(
            obsResponse?.response?.status,
            "201 Created",
            "Observation should be created",
        );
        assertExists(
            obsResponse?.response?.location,
            "Location should be provided for Observation",
        );

        // Verify that the Observation's subject reference was updated
        const observationResource = obsResponse?.resource as Observation;
        assertExists(
            observationResource.subject?.reference,
            "Observation should have a subject reference",
        );
        assertNotEquals(
            observationResource.subject?.reference,
            "Patient/unknown",
            "Unknown reference should be updated",
        );
        assertEquals(
            observationResource.subject?.reference.indexOf("Patient/") !== -1,
            true,
            "Observation subject should reference the created Patient",
        );
    });

    it("Accept Document Bundle", async () => {
        const patientId = `document-patient-${Date.now()}`;
        const documentBundle: Bundle = {
            resourceType: "Bundle",
            type: "document",
            entry: [
                {
                    resource: {
                        resourceType: "Composition",
                        status: "final",
                        type: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "34133-9",
                            }],
                        },
                        subject: {
                            reference: `Patient/${patientId}`,
                        },
                        date: new Date().toISOString(),
                        author: [{ reference: "Practitioner/example" }],
                        title: "Test Document",
                    },
                },
                {
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["Document"] }],
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(documentBundle),
        });

        assertEquals(
            response.status,
            200,
            "Document bundle should be accepted",
        );
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.type,
            "transaction-response",
            "Response should be a transaction-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Check Composition entry
        const compositionResponse = responseBundle.entry?.[0];
        assertEquals(
            compositionResponse?.response?.status,
            "201",
            "Composition should be created",
        );
        assertExists(
            compositionResponse?.response?.location,
            "Location should be provided for Composition",
        );

        // Check Patient entry
        const patientResponse = responseBundle.entry?.[1];
        assertEquals(
            patientResponse?.response?.status,
            "201",
            "Patient should be created",
        );
        assertExists(
            patientResponse?.response?.location,
            "Location should be provided for Patient",
        );
        assertEquals(
            patientResponse?.response?.location?.includes("document-patient"),
            true,
            "Patient should retain original id",
        );
    });
}
