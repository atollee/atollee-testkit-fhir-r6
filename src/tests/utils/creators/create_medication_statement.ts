import {
    CodeableConcept,
    Dosage,
    MedicationStatement,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { assertTrue } from "../../../../deps.test.ts";
import { getRandomText } from "./utils.ts";

export interface MedicationStatementOptions {
    id?: string;
    status?:
        | "active"
        | "completed"
        | "entered-in-error"
        | "intended"
        | "stopped"
        | "on-hold"
        | "unknown"
        | "not-taken";
    medicationCodeableConcept?: CodeableConcept;
    subject?: Reference;
    effectiveDateTime?: string;
    effectivePeriod?: {
        start: string;
        end?: string;
    };
    dateAsserted?: string;
    informationSource?: Reference;
    reasonCode?: CodeableConcept[];
    dosage?: Dosage[];
}

export async function createTestMedicationStatement(
    _context: ITestContext,
    patientId: string,
    options: MedicationStatementOptions = {},
): Promise<MedicationStatement> {
    const defaultOptions: MedicationStatementOptions = {
        status: "active",
        medicationCodeableConcept: {
            coding: [{
                system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                code: "1049502",
                display: "Acetaminophen 325 MG Oral Tablet",
            }],
        },
        effectiveDateTime: new Date().toISOString(),
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
    };

    const newMedicationStatement: MedicationStatement = {
        resourceType: "MedicationStatement",
        identifier: [{ value: `medication-statement-id-${getRandomText()}` }],
        status: mergedOptions.status || "active",
        medicationCodeableConcept: mergedOptions.medicationCodeableConcept,
        subject: {
            reference: `Patient/${patientId}`,
        },
        effectiveDateTime: mergedOptions.effectiveDateTime,
        dateAsserted: mergedOptions.dateAsserted || new Date().toISOString(),
    };

    if (mergedOptions.id) {
        newMedicationStatement.id = mergedOptions.id;
    }

    if (mergedOptions.effectivePeriod) {
        delete newMedicationStatement.effectiveDateTime;
        newMedicationStatement.effectivePeriod = mergedOptions.effectivePeriod;
    }

    if (mergedOptions.informationSource) {
        newMedicationStatement.informationSource =
            mergedOptions.informationSource;
    }

    if (mergedOptions.reasonCode) {
        newMedicationStatement.reasonCode = mergedOptions.reasonCode;
    }

    if (mergedOptions.dosage) {
        newMedicationStatement.dosage = mergedOptions.dosage;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "MedicationStatement",
        method: "POST",
        body: JSON.stringify(newMedicationStatement),
    });

    assertTrue(
        response.success,
        "Test MedicationStatement should be created successfully",
    );
    return response.jsonBody as MedicationStatement;
}
