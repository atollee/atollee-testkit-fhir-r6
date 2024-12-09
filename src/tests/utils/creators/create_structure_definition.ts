import { StructureDefinition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { StructureDefinitionOptions } from "./types.ts";
import { createIdentifierOptions } from "./utils.ts";
import { assertTrue } from "../../../../deps.test.ts";

export async function createTestStructureDefinition(
    _context: ITestContext,
    options: StructureDefinitionOptions,
): Promise<StructureDefinition> {
    const newStructureDefinition: StructureDefinition = {
        resourceType: "StructureDefinition",
        url: options.url,
        version: options.version,
        name: options.name,
        status: options.status,
        kind: options.kind,
        abstract: options.abstract,
        type: options.type,
        baseDefinition: options.baseDefinition ||
            "http://hl7.org/fhir/StructureDefinition/DomainResource",
        derivation: "constraint",
        identifier: createIdentifierOptions(options.identifier),
        // Adding text element to satisfy narrative requirement
        text: {
            status: "generated",
            div: '<div xmlns="http://www.w3.org/1999/xhtml">Test Structure Definition</div>',
        },
        differential: {
            element: [],
        },
    };

    if (options.versionScheme) {
        newStructureDefinition.extension = [{
            url: "http://hl7.org/fhir/StructureDefinition/structuredefinition-version-scheme",
            valueCode: options.versionScheme,
        }];
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "StructureDefinition",
        method: "POST",
        body: JSON.stringify(newStructureDefinition),
    });

    assertTrue(
        response.success,
        "creation of structure definition was successful",
    );
    return response.jsonBody as StructureDefinition;
}
