// Add this to your resource_creators.ts file or create a new file named create_medication.ts

import { CodeableConcept, Medication } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";

export interface MedicationOptions extends IIdentifierOptions {
    code?: CodeableConcept;
    status?: Medication["status"];
    manufacturer?: { reference: string };
    form?: CodeableConcept;
    amount?: {
        numerator?: {
            value: number;
            unit: string;
            system: string;
            code: string;
        };
        denominator?: {
            value: number;
            unit: string;
            system: string;
            code: string;
        };
    };
    ingredient?: Array<{
        itemCodeableConcept?: CodeableConcept;
        itemReference?: { reference: string };
        isActive?: boolean;
        strength?: {
            numerator?: {
                value: number;
                unit: string;
                system: string;
                code: string;
            };
            denominator?: {
                value: number;
                unit: string;
                system: string;
                code: string;
            };
        };
    }>;
}

export async function createTestMedication(
    _context: ITestContext,
    options: MedicationOptions = {},
): Promise<Medication> {
    const newMedication: Medication = {
        resourceType: "Medication",
        code: options.code || {
            coding: [{
                system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                code: "1049502",
                display: "Acetaminophen 325 MG Oral Tablet",
            }],
        },
        status: options.status || "active",
        manufacturer: options.manufacturer,
        form: options.form,
        amount: options.amount,
        ingredient: options.ingredient,
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Medication",
        method: "POST",
        body: JSON.stringify(newMedication),
    });

    return response.jsonBody as Medication;
}
