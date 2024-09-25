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

export interface MedicationRequestOptions {
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
    medicationCodeableConcept: {
      coding: [{
        system: "http://www.nlm.nih.gov/research/umls/rxnorm",
        code: "1049502",
        display: "Acetaminophen 325 MG Oral Tablet",
      }],
    },
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
  }

  const response = await fetchWrapper({
    authorized: true,
    relativeUrl: "MedicationRequest",
    method: "POST",
    body: JSON.stringify(newMedicationRequest),
  });

  return response.jsonBody as MedicationRequest;
}
