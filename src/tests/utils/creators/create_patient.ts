import { HumanName, Narrative, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { HumanNameOptions, LinkOptions, MaritalStatusCoding } from "./types.ts";
import { createHumanName } from "./utils.ts";
import { Meta } from "npm:@types/fhir";

export interface PatientOptions {
    id?: string;
    name?: HumanNameOptions | HumanNameOptions[];
    family?: string;
    given?: string[];
    birthDate?: string;
    gender?: "male" | "female" | "other" | "unknown";
    active?: boolean;
    // deno-lint-ignore no-explicit-any
    address?: any[]; // You might want to create a specific AddressOptions export interface
    // deno-lint-ignore no-explicit-any
    identifier?: any[]; // You might want to create a specific IdentifierOptions export interface
    link?: LinkOptions[];
    maritalStatus?: {
        coding: MaritalStatusCoding[];
    };
    generalPractitioner?: Array<{ reference: string }>;
    meta?: Meta;
    text?: Narrative;
}

export async function createTestPatient(
    _context: ITestContext,
    options: PatientOptions = {},
): Promise<Patient> {
    const defaultName = { family: "TestFamily", given: ["TestGiven"] };
    const defaultOptions: PatientOptions = {
        name: [defaultName],
        birthDate: "1990-01-01",
        gender: "unknown",
        active: true,
    };

    const mergedOptions = { ...defaultOptions, ...options };

    let patientName: HumanName[];
    if (mergedOptions.family || mergedOptions.given) {
        patientName = [{
            family: mergedOptions.family,
            given: mergedOptions.given,
        }];
    } else if (Array.isArray(mergedOptions.name)) {
        patientName = mergedOptions.name.map(createHumanName);
    } else if (mergedOptions.name) {
        patientName = [createHumanName(mergedOptions.name)];
    } else {
        patientName = [createHumanName(defaultName)];
    }

    const newPatient: Patient = {
        resourceType: "Patient",
        identifier: [{ value: `patient-id-${Date.now()}` }],
        name: patientName,
        birthDate: mergedOptions.birthDate,
        gender: mergedOptions.gender,
        active: mergedOptions.active,
        address: mergedOptions.address,
        link: mergedOptions.link,
        maritalStatus: mergedOptions.maritalStatus,
    };

    if (mergedOptions.id) {
        newPatient.id = mergedOptions.id;
    }

    if (mergedOptions.identifier) {
        newPatient.identifier = mergedOptions.identifier;
    }

    if (mergedOptions.meta) {
        newPatient.meta = mergedOptions.meta;
    }
    if (mergedOptions.text) {
        newPatient.text = mergedOptions.text;
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Patient",
        method: "POST",
        body: JSON.stringify(newPatient),
    });

    return response.jsonBody as Patient;
}
