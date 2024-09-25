// creators/create_composition.ts

import { Composition, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createTestPractitioner } from "./create_practitioner.ts";

interface CompositionSectionOptions {
    code?: {
        coding: Array<{
            system: string;
            code: string;
            display?: string;
        }>;
    };
    title?: string;
    text?: {
        status: "generated" | "extensions" | "additional" | "empty";
        div: string;
    };
}

interface CompositionOptions {
    status: "preliminary" | "final" | "amended" | "entered-in-error";
    type: {
        coding: Array<{
            system: string;
            code: string;
            display?: string;
        }>;
    };
    subject: Reference;
    sections?: CompositionSectionOptions[];
}

export async function createTestComposition(
    context: ITestContext,
    options: CompositionOptions,
): Promise<Composition> {
    const practitioner = await createTestPractitioner(context);

    const newComposition: Composition = {
        resourceType: "Composition",
        status: options.status,
        type: options.type,
        subject: options.subject,
        date: new Date().toISOString(),
        author: [{ reference: `Practitioner/${practitioner.id}` }],
        title: "Test Composition",
        section: options.sections,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Composition",
        method: "POST",
        body: JSON.stringify(newComposition),
    });

    return response.jsonBody as Composition;
}
