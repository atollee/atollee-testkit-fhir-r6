// utils/creators/create_encounter.ts

import { Encounter, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { IIdentifierOptions } from "./types.ts";
import { createIdentifierOptions } from "./utils.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface EncounterOptions extends IIdentifierOptions {
    status?: Encounter["status"];
    class?: {
        system: string;
        code: string;
        display?: string;
    };
    type?: Array<{
        coding: Array<{
            system: string;
            code: string;
            display?: string;
        }>;
    }>;
    subject?: Reference;
    participant?: Array<{
        type?: Array<{
            coding: Array<{
                system: string;
                code: string;
                display?: string;
            }>;
        }>;
        individual?: Reference;
    }>;
    period?: {
        start?: string;
        end?: string;
    };
    serviceProvider?: Reference;
}

export async function createTestEncounter(
    _context: ITestContext,
    options: EncounterOptions = {},
): Promise<Encounter> {
    const defaultOptions: EncounterOptions = {
        status: "finished",
        class: {
            system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
            code: "AMB",
            display: "ambulatory",
        },
        type: [{
            coding: [{
                system: "http://snomed.info/sct",
                code: "308335008",
                display: "Patient encounter procedure",
            }],
        }],
        period: {
            start: new Date().toISOString(),
            end: new Date().toISOString(),
        },
        identifier: createIdentifierOptions(options.identifier),
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const newEncounter: Partial<Encounter> = {
        resourceType: "Encounter",
        status: mergedOptions.status,
        type: mergedOptions.type,
        subject: mergedOptions.subject,
        participant: mergedOptions.participant,
        period: mergedOptions.period,
        serviceProvider: mergedOptions.serviceProvider,
        identifier: mergedOptions.identifier,
    };

    // Only add the class property if it's defined
    if (mergedOptions.class) {
        newEncounter.class = mergedOptions.class;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Encounter",
        method: "POST",
        body: JSON.stringify(newEncounter),
    });

    if (!response.success) {
        console.log(JSON.stringify(response, null, 2));
    }
    assertTrue(response.success, "creation of encounter was successful");
    return response.jsonBody as Encounter;
}
