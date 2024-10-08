// creators/create_observation.ts
import {
    CodeableConcept,
    Identifier,
    Meta,
    Narrative,
    Observation,
    Quantity,
    Range,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface ObservationOptions extends IIdentifierOptions {
    code?: string;
    system?: string;
    value?: number;
    unit?: string;
    status?:
        | "registered"
        | "preliminary"
        | "final"
        | "amended"
        | "corrected"
        | "cancelled"
        | "entered-in-error"
        | "unknown";
    display?: string;
    subject?: Reference;
    encounter?: Reference;
    effectiveDateTime?: string;
    effectiveInstant?: string;
    valueQuantity?: Quantity;
    valueRange?: Range;
    valueString?: string;
    performer?: Reference[];
    valueCodeableConcept?: CodeableConcept;
    issued?: string;
    identifier?: Identifier[];
    meta?: Meta;
    text?: Narrative;
    derivedFrom?: Reference[];
}

export async function createTestObservation(
    _context: ITestContext,
    patientId: string,
    options: ObservationOptions = {},
): Promise<Observation> {
    const defaultOptions: ObservationOptions = {
        code: "15074-8",
        system: "http://loinc.org",
        value: 100,
        unit: "mg/dL",
        status: "final",
        identifier: createIdentifierOptions(options.identifier),
    };
    const mergedOptions = { ...defaultOptions, ...options };
    const newObservation: Observation = {
        resourceType: "Observation",
        status: mergedOptions.status || "unknown",
        code: {
            coding: [{
                system: mergedOptions.system,
                code: mergedOptions.code,
                display: mergedOptions.display,
            }],
        },
        subject: mergedOptions.subject || {
            reference: `Patient/${patientId}`,
        },
        encounter: mergedOptions.encounter,
        effectiveDateTime: mergedOptions.effectiveDateTime,
        effectiveInstant: mergedOptions.effectiveInstant,
        issued: mergedOptions.issued,
        performer: mergedOptions.performer,
        valueCodeableConcept: mergedOptions.valueCodeableConcept,
        identifier: mergedOptions.identifier,
        text: mergedOptions.text,
        derivedFrom: mergedOptions.derivedFrom,
    };
    if (mergedOptions.valueRange) {
        newObservation.valueRange = mergedOptions.valueRange;
    } else if (mergedOptions.valueQuantity) {
        newObservation.valueQuantity = mergedOptions.valueQuantity;
    } else if (mergedOptions.valueString !== undefined) {
        newObservation.valueString = mergedOptions.valueString;
    } else if (mergedOptions.value !== undefined && mergedOptions.unit) {
        newObservation.valueQuantity = {
            value: mergedOptions.value,
            unit: mergedOptions.unit,
            system: "http://unitsofmeasure.org",
            code: mergedOptions.unit,
        };
    }
    if (options.meta) {
        newObservation.meta = options.meta;
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Observation",
        method: "POST",
        body: JSON.stringify(newObservation),
    });
    if (!response.success) {
        console.log(JSON.stringify(response.jsonBody));
    }
    assertTrue(response.success, "test observation succesfully created");
    return response.jsonBody as Observation;
}
