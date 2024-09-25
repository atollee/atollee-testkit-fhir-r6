import { DocumentReference } from "npm:@types/fhir/r4.d.ts";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";

export async function createTestDocumentReference(
    context: ITestContext,
    options: { contentType: string },
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
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "DocumentReference",
        method: "POST",
        body: JSON.stringify(newDocumentReference),
    });

    return response.jsonBody as DocumentReference;
}
