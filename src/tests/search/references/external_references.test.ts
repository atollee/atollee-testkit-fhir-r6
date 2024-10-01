// tests/search/parameters/external_references.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestDocumentReference,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Binary, Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runExternalReferencesTests(context: ITestContext) {
    it("Should include resources from external servers when using _include", async () => {
        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const documentReference = await createTestDocumentReference(context, {
            contentType: "text/plain",
        });

        // Simulate an external reference by updating the DocumentReference
        const updatedDocumentReference = {
            ...documentReference,
            author: [{
                reference:
                    "http://external-server.example.com/fhir/Practitioner/external-practitioner-id",
            }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference/${documentReference.id}`,
            method: "PUT",
            body: JSON.stringify(updatedDocumentReference),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `DocumentReference?_id=${documentReference.id}&_include=DocumentReference:author`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 2,
            "Bundle should contain at least 2 entries (DocumentReference and external Practitioner)",
        );

        const includedPractitioner = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Practitioner" &&
            entry.fullUrl?.startsWith("http://external-server.example.com/fhir")
        );
        assertExists(
            includedPractitioner,
            "Bundle should include the external Practitioner",
        );
        assertEquals(
            includedPractitioner.search?.mode,
            "include",
            "Included Practitioner should have search mode set to 'include'",
        );
    });

    it("Should include non-Resource entities as Binary resources when using _include", async () => {
        const documentReference = await createTestDocumentReference(context, {
            contentType: "image/jpeg",
        });

        // Simulate an external attachment by updating the DocumentReference
        const updatedDocumentReference = {
            ...documentReference,
            content: [{
                attachment: {
                    contentType: "image/jpeg",
                    url: "http://example.org/images/2343434/234234.jpg",
                },
            }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference/${documentReference.id}`,
            method: "PUT",
            body: JSON.stringify(updatedDocumentReference),
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `DocumentReference?_id=${documentReference.id}&_include=DocumentReference:content`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 2,
            "Bundle should contain at least 2 entries (DocumentReference and Binary)",
        );

        const includedBinary = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Binary"
        );
        assertExists(
            includedBinary,
            "Bundle should include the Binary resource",
        );
        assertEquals(
            includedBinary.search?.mode,
            "include",
            "Included Binary should have search mode set to 'include'",
        );

        const binaryResource = includedBinary.resource as Binary;
        assertEquals(
            binaryResource.contentType,
            "image/jpeg",
            "Binary resource should have correct content type",
        );
        assertExists(
            binaryResource.data,
            "Binary resource should contain data",
        );
    });
}
