// tests/search/types/search_types_fhir_types.test.ts

import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestPatient,
    createTestObservation,
    createTestMedicationRequest,
    createTestPractitioner,
    createTestValueSet
} from "../../utils/resource_creators.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSearchTypesFHIRTypesTests(context: ITestContext) {
  it("Should search date type against date, dateTime, instant, Period, and Timing", async () => {
    const patient = await createTestPatient(context);
    
    // Date
    await createTestObservation(context, patient.id!, {
      code: "date-test",
      effectiveDateTime: "2023-05-01"
    });

    // DateTime
    await createTestObservation(context, patient.id!, {
      code: "datetime-test",
      effectiveDateTime: "2023-05-01T12:00:00Z"
    });

    // Instant (represented as dateTime in FHIR R4)
    await createTestObservation(context, patient.id!, {
      code: "instant-test",
      issued: "2023-05-01T12:00:00.123Z"
    });

    // Period
    await createTestMedicationRequest(context, patient.id!, {
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        coding: [{
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "1049502",
          display: "Acetaminophen 325 MG Oral Tablet"
        }]
      },
      dosageInstruction: [{
        timing: {
          repeat: {
            boundsPeriod: {
              start: "2023-05-01",
              end: "2023-05-07"
            }
          }
        }
      }]
    });

    // Timing (represented within dosageInstruction)
    await createTestMedicationRequest(context, patient.id!, {
      status: "active",
      intent: "order",
      medicationCodeableConcept: {
        coding: [{
          system: "http://www.nlm.nih.gov/research/umls/rxnorm",
          code: "1049502",
          display: "Acetaminophen 325 MG Oral Tablet"
        }]
      },
      dosageInstruction: [{
        timing: {
          repeat: {
            frequency: 3,
            period: 1,
            periodUnit: "d"
          }
        }
      }]
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?date=2023-05-01`,
    });

    assertEquals(response.status, 200, "Server should process date search successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 3, "Should find 3 resources matching the date");
  });

  it("Should search number type against decimal, integer, and positiveInt", async () => {
    const patient = await createTestPatient(context);
    
    // Decimal
    await createTestObservation(context, patient.id!, {
      code: "decimal-test",
      valueQuantity: {
        value: 98.6,
        unit: "degrees Fahrenheit"
      }
    });

    // Integer
    await createTestObservation(context, patient.id!, {
      code: "integer-test",
      valueQuantity: {
        value: 120,
        unit: "mmHg"
      }
    });

    // PositiveInt (represented as integer in FHIR R4)
    await createTestObservation(context, patient.id!, {
      code: "positiveint-test",
      valueQuantity: {
        value: 5,
        unit: "times"
      }
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?value-quantity=gt100`,
    });

    assertEquals(response.status, 200, "Server should process number search successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 resource with value greater than 100");
  });

  it("Should search quantity type against Quantity values", async () => {
    const patient = await createTestPatient(context);
    
    await createTestObservation(context, patient.id!, {
      code: "quantity-test",
      valueQuantity: {
        value: 75,
        unit: "kg",
        system: "http://unitsofmeasure.org",
        code: "kg"
      }
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?value-quantity=75|http://unitsofmeasure.org|kg`,
    });

    assertEquals(response.status, 200, "Server should process quantity search successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 resource matching the quantity");
  });

  it("Should search reference type against canonical, URI, URL, and Reference", async () => {
    const patient = await createTestPatient(context);
    const practitioner = await createTestPractitioner(context);
    const valueSet = await createTestValueSet(context, {
      url: "http://example.com/fhir/ValueSet/test-valueset"
    });
    
    // Reference
    await createTestObservation(context, patient.id!, {
      code: "reference-test",
      performer: [{
        reference: `Practitioner/${practitioner.id}`
      }]
    });

    // Canonical
    await createTestObservation(context, patient.id!, {
      code: "canonical-test",
      valueCodeableConcept: {
        coding: [{
          system: valueSet.url
        }]
      }
    });

    const referenceResponse = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?performer=${practitioner.id}`,
    });

    assertEquals(referenceResponse.status, 200, "Server should process reference search successfully");
    const referenceBundle = referenceResponse.jsonBody as Bundle;
    assertExists(referenceBundle.entry, "Bundle should contain entries");
    assertEquals(referenceBundle.entry.length, 1, "Should find 1 resource matching the reference");

    const canonicalResponse = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?value-concept=${valueSet.url}`,
    });

    assertEquals(canonicalResponse.status, 200, "Server should process canonical search successfully");
    const canonicalBundle = canonicalResponse.jsonBody as Bundle;
    assertExists(canonicalBundle.entry, "Bundle should contain entries");
    assertEquals(canonicalBundle.entry.length, 1, "Should find 1 resource matching the canonical");
  });

  it("Should search string type against string values", async () => {
    await createTestPatient(context, {
      name: [{
        family: "Doe",
        given: ["John"]
      }]
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?name=Doe`,
    });

    assertEquals(response.status, 200, "Server should process string search successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 patient matching the name");
  });

  it("Should search token type against boolean, code, CodeableConcept, and Identifier", async () => {
    await createTestPatient(context, {
      active: true,
      gender: "male",
      identifier: [{
        system: "http://example.com/mrn",
        value: "12345"
      }]
    });

    const booleanResponse = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?active=true`,
    });

    assertEquals(booleanResponse.status, 200, "Server should process boolean token search successfully");
    const booleanBundle = booleanResponse.jsonBody as Bundle;
    assertExists(booleanBundle.entry, "Bundle should contain entries");
    assertEquals(booleanBundle.entry.length, 1, "Should find 1 patient matching the active status");

    const codeResponse = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?gender=male`,
    });

    assertEquals(codeResponse.status, 200, "Server should process code token search successfully");
    const codeBundle = codeResponse.jsonBody as Bundle;
    assertExists(codeBundle.entry, "Bundle should contain entries");
    assertEquals(codeBundle.entry.length, 1, "Should find 1 patient matching the gender");

    const identifierResponse = await fetchWrapper({
      authorized: true,
      relativeUrl: `Patient?identifier=http://example.com/mrn|12345`,
    });

    assertEquals(identifierResponse.status, 200, "Server should process identifier token search successfully");
    const identifierBundle = identifierResponse.jsonBody as Bundle;
    assertExists(identifierBundle.entry, "Bundle should contain entries");
    assertEquals(identifierBundle.entry.length, 1, "Should find 1 patient matching the identifier");
  });

  it("Should search uri type against canonical, URI, and URL values", async () => {
    await createTestValueSet(context, {
      url: "http://example.com/fhir/ValueSet/test-valueset"
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `ValueSet?url=http://example.com/fhir/ValueSet/test-valueset`,
    });

    assertEquals(response.status, 200, "Server should process uri search successfully");
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(bundle.entry.length, 1, "Should find 1 ValueSet matching the URL");
  });
}