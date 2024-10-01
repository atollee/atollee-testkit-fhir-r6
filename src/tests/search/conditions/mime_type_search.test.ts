// tests/search/parameters/mime_type_search.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestDocumentReference } from "../../utils/resource_creators.ts";
import { Bundle, DocumentReference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runMimeTypeSearchTests(context: ITestContext) {
    it("Should find DocumentReference with exact MIME type match", async () => {
        const docRef = await createTestDocumentReference(context, {
            contentType: "text/xml",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference?contenttype=text/xml`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process MIME type search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DocumentReference).id === docRef.id
            ),
            "Results should include the created DocumentReference",
        );
    });

    it("Should find DocumentReference with MIME type and charset using :below modifier", async () => {
        const docRef = await createTestDocumentReference(context, {
            contentType: "text/xml; charset=UTF-8",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference?contenttype:below=text/xml`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process MIME type search with :below modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DocumentReference).id === docRef.id
            ),
            "Results should include the DocumentReference with charset",
        );
    });

    it("Should find all image DocumentReferences using :below modifier on first segment", async () => {
        const pngDocRef = await createTestDocumentReference(context, {
            contentType: "image/png",
        });

        const jpegDocRef = await createTestDocumentReference(context, {
            contentType: "image/jpeg",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference?contenttype:below=image`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process MIME type search with :below modifier on first segment successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DocumentReference).id === pngDocRef.id
            ),
            "Results should include the PNG DocumentReference",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DocumentReference).id === jpegDocRef.id
            ),
            "Results should include the JPEG DocumentReference",
        );
    });

    it("Should not find non-matching MIME types when using :below modifier", async () => {
        await createTestDocumentReference(context, {
            contentType: "application/pdf",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `DocumentReference?contenttype:below=text/xml`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process MIME type search with :below modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            0,
            "Results should not include any DocumentReferences",
        );
    });
}
