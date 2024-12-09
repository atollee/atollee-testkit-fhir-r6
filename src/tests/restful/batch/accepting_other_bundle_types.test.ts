// tests/accepting_other_bundle_types.test.ts

import { fetchWrapper, patchUrl } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    Composition,
    Observation,
    OperationOutcome,
    Patient,
    Resource,
} from "npm:@types/fhir/r4.d.ts";

export function runAcceptingOtherBundleTypesTests(context: ITestContext) {
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
        const documentBundle: Bundle<Resource> = {
            resourceType: "Bundle",
            type: "document", // MUST be document type
            entry: [
                {
                    fullUrl: "urn:uuid:" + crypto.randomUUID(), // MUST have fullUrl
                    resource: {
                        resourceType: "Composition", // MUST be first entry
                        status: "final",
                        type: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "34133-9",
                            }],
                        },
                        subject: {
                            reference: `Patient/${patientId}`, // Reference MUST be URL
                        },
                        date: new Date().toISOString(),
                        title: "Test Document",
                    } as Composition,
                },
                {
                    fullUrl: `urn:uuid:${patientId}`, // MUST have fullUrl
                    resource: {
                        resourceType: "Patient", // MUST include referenced resources
                        id: patientId,
                        name: [{ family: "Test", given: ["Document"] }],
                    } as Patient,
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
        assertTrue(
            responseBundle.type === "transaction-response" ||
                responseBundle.type === "batch-response",
            "Response should be a transaction-response or batch-response",
        );
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        // Verify both resources were stored
        const compositionResponse = responseBundle.entry?.[0];
        assertExists(
            compositionResponse?.response?.location,
            "Location should be provided for Composition",
        );

        const patientResponse = responseBundle.entry?.[1];
        assertExists(
            patientResponse?.response?.location,
            "Location should be provided for Patient",
        );
    });
    /*
    it("Verify Document Bundle References and Content", async () => {
        const patientId = `document-patient-${Date.now()}`;
        const compositionId = crypto.randomUUID();
        const documentId = crypto.randomUUID();

        // Create a document bundle with identifier and proper references
        const documentBundle: Bundle<Resource> = {
            resourceType: "Bundle",
            type: "document",
            identifier: { // Document MUST have identifier
                system: "urn:ietf:rfc:3986",
                value: `urn:uuid:${documentId}`,
            },
            timestamp: new Date().toISOString(), // Document MUST have timestamp
            entry: [
                {
                    fullUrl: `urn:uuid:${compositionId}`,
                    resource: {
                        resourceType: "Composition",
                        id: compositionId,
                        identifier: { // Optional composition identifier
                            system: "http://example.org/documents",
                            value: "doc-1",
                        },
                        status: "final",
                        type: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "34133-9",
                            }],
                        },
                        subject: {
                            reference: `Patient/${patientId}`,
                            display: "Test Document Patient",
                        },
                        author: [{
                            reference: `Patient/${patientId}`, // Author MUST be included in bundle
                        }],
                        title: "Test Document",
                        date: new Date().toISOString(),
                        section: [{
                            title: "Test Section",
                            text: {
                                status: "generated",
                                div: '<div xmlns="http://www.w3.org/1999/xhtml">Test narrative</div>',
                            },
                        }],
                    } as Composition,
                },
                {
                    fullUrl: `urn:uuid:${patientId}`,
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Test", given: ["Document"] }],
                    } as Patient,
                },
            ],
        };

        // Store the document
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

        // Verify we can retrieve the document by Bundle ID
        const bundle = response.jsonBody as Bundle;
        const bundleLocation = bundle.entry
            ? bundle.entry[0].response?.location
            : undefined;
        assertExists(bundleLocation, "Bundle location should be provided");
        const getBundle = await fetchWrapper({
            authorized: true,
            relativeUrl: patchUrl(context, bundleLocation),
        });

        assertEquals(
            getBundle.status,
            200,
            "Should retrieve stored document bundle",
        );
        const retrievedBundle = getBundle.jsonBody as Bundle;
        assertEquals(
            retrievedBundle.type,
            "document",
            "Retrieved bundle should be document type",
        );
        assertEquals(
            retrievedBundle.identifier?.value,
            `urn:uuid:${documentId}`,
            "Document ID should match",
        );

        // Verify composition is first entry
        assertEquals(
            retrievedBundle.entry?.[0].resource?.resourceType,
            "Composition",
            "First entry must be Composition",
        );

        // Verify all referenced resources are included
        const composition = retrievedBundle.entry?.[0].resource as Composition;
        const subjectRef = composition.subject?.reference;
        assertTrue(
            retrievedBundle.entry?.some((e) =>
                `${e.resource?.resourceType}/${e.resource?.id}` === subjectRef
            ),
            "Referenced subject must be included in bundle",
        );
    });
    /*
    it("Verify Document Bundle Cannot Be Modified", async () => {
        // First create a document bundle
        const patientId = `document-patient-${Date.now()}`;
        const documentId = crypto.randomUUID();

        const documentBundle: Bundle<Resource> = {
            resourceType: "Bundle",
            type: "document",
            identifier: {
                system: "urn:ietf:rfc:3986",
                value: `urn:uuid:${documentId}`,
            },
            timestamp: new Date().toISOString(),
            entry: [
                {
                    fullUrl: `urn:uuid:${crypto.randomUUID()}`,
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
                        title: "Original Title",
                    } as Composition,
                },
                {
                    fullUrl: `urn:uuid:${patientId}`,
                    resource: {
                        resourceType: "Patient",
                        id: patientId,
                        name: [{ family: "Original", given: ["Name"] }],
                    } as Patient,
                },
            ],
        };

        // Store the original document
        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(documentBundle),
        });

        assertEquals(
            createResponse.status,
            200,
            "Document bundle should be accepted",
        );

        // Try to modify the document by changing the title
        const storedBundle = createResponse.jsonBody as Bundle;
        assertExists(storedBundle, "Bundle should be provided");
        assertExists(storedBundle.entry, "Bundle should have entries");
        const storedBundleLocation = storedBundle.entry?.length ?? 0 > 0
            ? storedBundle.entry[0].response?.location
            : undefined;
        assertExists(
            storedBundleLocation,
            "Bundle location should be provided",
        );
        const modifiedBundle = { ...documentBundle };
        (modifiedBundle.entry![0].resource as Composition).title =
            "Modified Title";

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: patchNextLink(context, storedBundleLocation),
            method: "PUT",
            body: JSON.stringify(modifiedBundle),
        });

        // Server should either reject the modification or create a new document version
        if (updateResponse.status === 400) {
            // If server rejects modifications
            const operationOutcome = updateResponse
                .jsonBody as OperationOutcome;
            assertTrue(
                operationOutcome.issue?.some((i) =>
                    i.severity === "error" &&
                    i.code === "invalid"
                ),
                "Server should reject document modifications",
            );
        } else if (updateResponse.status === 201) {
            // If server creates new version
            const newBundleLocation = updateResponse.headers.get("Location");
            assertNotEquals(
                storedBundleLocation,
                newBundleLocation,
                "Modified document should have new location",
            );

            // Verify original document still exists unchanged
            const originalResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: patchNextLink(context, storedBundleLocation),
            });

            assertEquals(
                originalResponse.status,
                200,
                "Original document should still exist",
            );
            const originalBundle = originalResponse.jsonBody as Bundle;
            assertExists(originalBundle, "Bundle should be provided");
            assertExists(originalBundle.entry, "Bundle should have entries");
            assertEquals(
                (originalBundle.entry[0].resource as Composition).title,
                "Original Title",
                "Original document should be unchanged",
            );
        }
    });*/
}
