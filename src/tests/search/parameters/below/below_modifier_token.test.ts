// tests/search/parameters/below_modifier_token.test.ts

import {
  assertEquals,
  assertExists,
  assertFalse,
  assertTrue,
  it,
} from "../../../../../deps.test.ts";
import { fetchWrapper } from "../../../utils/fetch.ts";
import {
  createTestObservation,
  createTestPatient,
} from "../../../utils/resource_creators.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

const SNOMED_SYSTEM = "http://snomed.info/sct";

export function runBelowModifierTokenTests(context: ITestContext) {
  it("Should find observations with codes below the specified SNOMED CT code", async () => {
    const patient = await createTestPatient(context, {});

    // Create observations with different SNOMED CT codes
    await createTestObservation(context, patient.id!, {
      code: "235862008",
      system: SNOMED_SYSTEM,
      display: "Hepatitis due to infection",
    });
    await createTestObservation(context, patient.id!, {
      code: "773113008",
      system: SNOMED_SYSTEM,
      display: "Acute infectious hepatitis",
    });
    await createTestObservation(context, patient.id!, {
      code: "95897009",
      system: SNOMED_SYSTEM,
      display: "Amebic hepatitis",
    });
    // Create an observation with an unrelated code
    await createTestObservation(context, patient.id!, {
      code: "386661006",
      system: SNOMED_SYSTEM,
      display: "Fever",
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code:below=${SNOMED_SYSTEM}|235862008`,
    });

    assertEquals(
      response.status,
      200,
      "Server should process search with below modifier on token successfully",
    );
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(
      bundle.entry.length,
      3,
      "Bundle should contain three matching Observations",
    );

    const codes = bundle.entry.map((entry) =>
      (entry.resource as Observation).code.coding?.[0].code
    );
    assertTrue(
      codes.includes("235862008"),
      "Results should include the exact code",
    );
    assertTrue(
      codes.includes("773113008"),
      "Results should include child code 'Acute infectious hepatitis'",
    );
    assertTrue(
      codes.includes("95897009"),
      "Results should include child code 'Amebic hepatitis'",
    );
    assertFalse(
      codes.includes("386661006"),
      "Results should not include unrelated code 'Fever'",
    );
  });

  it("Should handle token search without system", async () => {
    const patient = await createTestPatient(context, {});

    await createTestObservation(context, patient.id!, {
      code: "235862008",
      system: SNOMED_SYSTEM,
      display: "Hepatitis due to infection",
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code:below=235862008`,
    });

    assertEquals(
      response.status,
      200,
      "Server should process search with below modifier on token without system",
    );
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(
      bundle.entry.length > 0,
      "Bundle should contain at least one matching Observation",
    );
  });

  it("Should handle token search with only system", async () => {
    const patient = await createTestPatient(context, {});

    await createTestObservation(context, patient.id!, {
      code: "235862008",
      system: SNOMED_SYSTEM,
      display: "Hepatitis due to infection",
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code:below=${SNOMED_SYSTEM}|`,
    });

    assertEquals(
      response.status,
      200,
      "Server should process search with below modifier on token with only system",
    );
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertTrue(
      bundle.entry.length > 0,
      "Bundle should contain at least one matching Observation",
    );
  });

  it("Should resolve MIME types using below modifier", async () => {
    const patient = await createTestPatient(context, {});

    // Create observations with different MIME types
    await createTestObservation(context, patient.id!, {
      code: "image/png",
      system: "urn:ietf:bcp:13",
      display: "PNG image",
    });
    await createTestObservation(context, patient.id!, {
      code: "image/jpeg",
      system: "urn:ietf:bcp:13",
      display: "JPEG image",
    });
    await createTestObservation(context, patient.id!, {
      code: "text/plain",
      system: "urn:ietf:bcp:13",
      display: "Plain text",
    });

    const response = await fetchWrapper({
      authorized: true,
      relativeUrl: `Observation?code:below=urn:ietf:bcp:13|image`,
    });

    assertEquals(
      response.status,
      200,
      "Server should process search with below modifier for MIME types",
    );
    const bundle = response.jsonBody as Bundle;
    assertExists(bundle.entry, "Bundle should contain entries");
    assertEquals(
      bundle.entry.length,
      2,
      "Bundle should contain two matching Observations",
    );

    const mimeTypes = bundle.entry.map((entry) =>
      (entry.resource as Observation).code.coding?.[0].code
    );
    assertTrue(
      mimeTypes.includes("image/png"),
      "Results should include PNG image",
    );
    assertTrue(
      mimeTypes.includes("image/jpeg"),
      "Results should include JPEG image",
    );
    assertFalse(
      mimeTypes.includes("text/plain"),
      "Results should not include plain text",
    );
  });
}
