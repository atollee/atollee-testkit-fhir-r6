import { HumanName, Narrative, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import {
    HumanNameOptions,
    IIdentifierOptions,
    LinkOptions,
    MaritalStatusCoding,
} from "./types.ts";
import {
    createHumanName,
    createIdentifierOptions,
    getRandomText,
} from "./utils.ts";
import { Meta } from "npm:@types/fhir";
import { assertTrue } from "../../../../deps.test.ts";

export interface PatientOptions extends IIdentifierOptions {
    id?: string;
    name?: HumanNameOptions | HumanNameOptions[];
    family?: string;
    given?: string[];
    birthDate?: string;
    gender?: "male" | "female" | "other" | "unknown";
    active?: boolean;
    // deno-lint-ignore no-explicit-any
    address?: any[]; // You might want to create a specific AddressOptions export interface
    link?: LinkOptions[];
    maritalStatus?: {
        coding: MaritalStatusCoding[];
    };
    generalPractitioner?: Array<{ reference: string }>;
    meta?: Meta;
    text?: Narrative;
    communication?: Array<{
        language: {
            coding: Array<{
                system: string;
                code: string;
                display?: string;
            }>;
        };
    }>;
    managingOrganization?: {
        reference: string;
    };
    nameUndefined?: boolean;
    birthdateUndefined?: boolean;
    genderUndefined?: boolean;
}

export function getTestPatientCurrentIdentifier() {
    return `test-id-${getRandomText()}`;
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

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        identifier: createIdentifierOptions(options.identifier),
    };

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
        communication: options.communication,
        managingOrganization: options.managingOrganization,
        generalPractitioner: options.generalPractitioner,
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
    if (options.nameUndefined) {
        delete newPatient.name;
    }
    if (options.birthdateUndefined) {
        delete newPatient.birthDate;
    }
    if (options.genderUndefined) {
        delete newPatient.gender;
    }
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Patient",
        method: "POST",
        body: JSON.stringify(newPatient),
    });

    assertTrue(response.success, "Test Patient should be created successfully");
    return response.jsonBody as Patient;
}
