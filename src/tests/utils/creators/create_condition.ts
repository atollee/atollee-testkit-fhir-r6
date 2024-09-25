// tests/utils/resource_creators.ts

import {
    CodeableConcept,
    Condition,
    Meta,
    Narrative,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface ConditionOptions {
    code?: CodeableConcept | {
        coding?: Array<{
            system: string;
            code: string;
            display?: string;
        }>;
        text?: string;
    };
    subject?: Reference;
    text?: Narrative;
    meta?: Meta;
    clinicalStatus?: CodeableConcept; // Add this line
}

export async function createTestCondition(
    context: ITestContext,
    options: ConditionOptions,
): Promise<Condition> {
    const newCondition: Condition = {
        resourceType: "Condition",
        subject: options.subject ||
            { reference: `Patient/${context.getValidPatientId()}` },
        code: options.code || {
            coding: [{
                system: "http://snomed.info/sct",
                code: "386661006",
                display: "Fever",
            }],
        },
        clinicalStatus: options.clinicalStatus || { // Modify this line
            coding: [{
                system:
                    "http://terminology.hl7.org/CodeSystem/condition-clinical",
                code: "active",
            }],
        },
        verificationStatus: {
            coding: [{
                system:
                    "http://terminology.hl7.org/CodeSystem/condition-ver-status",
                code: "confirmed",
            }],
        },
        text: options.text,
    };
    if (options.meta) {
        newCondition.meta = options.meta;
    }

    // If code is provided as an object with just text, convert it to CodeableConcept
    if (
        typeof newCondition.code === "object" && "text" in newCondition.code &&
        !("coding" in newCondition.code)
    ) {
        newCondition.code = {
            text: newCondition.code.text,
        };
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Condition",
        method: "POST",
        body: JSON.stringify(newCondition),
    });

    return response.jsonBody as Condition;
}
