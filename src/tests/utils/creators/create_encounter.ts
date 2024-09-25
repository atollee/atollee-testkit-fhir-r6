// utils/creators/create_encounter.ts

import { Encounter, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface EncounterOptions {
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

    return response.jsonBody as Encounter;
}
