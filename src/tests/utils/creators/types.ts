import { Identifier, Reference } from "npm:@types/fhir/r4.d.ts";

export interface HumanNameOptions {
    family?: string;
    given?: string[];
    prefix?: string[];
    suffix?: string[];
    text?: string;
}
export interface LinkOptions {
    other: Reference;
    type: "replaced-by" | "replaces" | "refer" | "seealso";
}

export interface MaritalStatusCoding {
    system: string;
    code: string;
    display?: string;
}

export interface StructureDefinitionOptions extends IIdentifierOptions {
    url: string;
    version?: string;
    name: string;
    status: "draft" | "active" | "retired" | "unknown";
    kind: "primitive-type" | "complex-type" | "resource" | "logical";
    abstract: boolean;
    type: string;
    baseDefinition?: string;
    versionScheme?: string;
}

export interface IIdentifierOptions { 
    identifier?: Partial<Identifier>[]
}
