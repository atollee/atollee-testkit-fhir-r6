// creators/create_composition.ts

import { Composition, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createTestPractitioner } from "./create_practitioner.ts";
import { IIdentifierOptions } from "./types.ts";
import { createTestIdentifier } from "../resource_creators.ts";
import { assertTrue } from "../../../../deps.test.ts";

interface CompositionSectionOptions extends IIdentifierOptions {
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

interface CompositionOptions extends IIdentifierOptions {
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
        identifier: createTestIdentifier(),
    };

    for (const section of newComposition.section ?? []) {
        if (
            section.entry === undefined || section.section === undefined ||
            section.text === undefined
        ) {
            section.text = {
                status: "generated",
                div: "<div>Dummy text</div>",
            };
        }
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Composition",
        method: "POST",
        body: JSON.stringify(newComposition),
    });

    assertTrue(response.success, "creation of composition was successful");
    return response.jsonBody as Composition;
}
