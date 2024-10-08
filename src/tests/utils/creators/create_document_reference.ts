import { DocumentReference } from "npm:@types/fhir/r4.d.ts";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";
import { IIdentifierOptions } from "./types.ts";
import { createIdentifierOptions } from "./utils.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface DocumentReferenceOptions extends IIdentifierOptions {
    contentType: string;
}

export async function createTestDocumentReference(
    context: ITestContext,
    options: DocumentReferenceOptions,
): Promise<DocumentReference> {
    const newDocumentReference: DocumentReference = {
        resourceType: "DocumentReference",
        status: "current",
        docStatus: "final",
        content: [{
            attachment: {
                contentType: options.contentType,
                data: btoa("Test content"),
            },
        }],
        subject: { reference: `Patient/${context.getValidPatientId()}` },
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "DocumentReference",
        method: "POST",
        body: JSON.stringify(newDocumentReference),
    });

    if (!response.success) {
        console.log(JSON.stringify(response, null, 2));
    }
    assertTrue(
        response.success,
        "creation of document reference was successful",
    );
    return response.jsonBody as DocumentReference;
}
