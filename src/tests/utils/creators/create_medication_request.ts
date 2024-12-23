// Add this to your resource_creators.ts file or create a new file named create_medication_request.ts

import {
    CodeableConcept,
    Dosage,
    Medication,
    MedicationRequest,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface MedicationRequestOptions extends IIdentifierOptions {
    status?: MedicationRequest["status"];
    intent?: MedicationRequest["intent"];
    medicationCodeableConcept?: CodeableConcept;
    subject?: Reference;
    encounter?: Reference;
    authoredOn?: string;
    requester?: Reference;
    dosageInstruction?: Dosage[];
    containedMedication?: Medication;
}

export async function createTestMedicationRequest(
    _context: ITestContext,
    patientId: string,
    options: MedicationRequestOptions = {},
): Promise<MedicationRequest> {
    const defaultOptions: MedicationRequestOptions = {
        status: "active",
        intent: "order",

        identifier: createIdentifierOptions(options.identifier),
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const newMedicationRequest: MedicationRequest = {
        resourceType: "MedicationRequest",
        status: mergedOptions.status!,
        intent: mergedOptions.intent!,
        medicationCodeableConcept: mergedOptions.medicationCodeableConcept,
        subject: mergedOptions.subject || {
            reference: `Patient/${patientId}`,
        },
        encounter: mergedOptions.encounter,
        authoredOn: mergedOptions.authoredOn,
        requester: mergedOptions.requester,
        dosageInstruction: mergedOptions.dosageInstruction,
    };

    if (options.containedMedication) {
        newMedicationRequest.contained = [options.containedMedication];
        newMedicationRequest.medicationReference = {
            reference: `#${options.containedMedication.id}`,
        };
    } else if (!newMedicationRequest.medicationCodeableConcept) {
        newMedicationRequest.medicationCodeableConcept = {
            coding: [{
                system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                code: "1049502",
                display: "Acetaminophen 325 MG Oral Tablet",
            }],
        };
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "MedicationRequest",
        method: "POST",
        body: JSON.stringify(newMedicationRequest),
    });

    assertTrue(response.success, "medication request was created");
    return response.jsonBody as MedicationRequest;
}
