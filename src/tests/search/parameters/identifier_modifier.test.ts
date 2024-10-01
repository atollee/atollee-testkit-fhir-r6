// tests/search/parameters/identifier_modifier.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, OperationOutcome } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runIdentifierModifierTests(context: ITestContext) {
    it("Should find observations with matching subject identifier", async () => {
        const patientIdentifier = {
            system: "http://example.org/fhir/mrn",
            value: uniqueString("12345"),
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestObservation(context, patient.id!, {
            subject: {
                reference: `Patient/${patient.id}`,
                identifier: patientIdentifier,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:identifier=${
                encodeURIComponent(patientIdentifier.system)
            }|${patientIdentifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search with identifier modifier successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry?.length,
            1,
            "Should find exactly one observation",
        );
        const observation = bundle.entry
            ? bundle.entry[0].resource as Observation
            : undefined;
        assertEquals(
            observation?.subject?.identifier?.system,
            patientIdentifier.system,
            "Should match the identifier system",
        );
        assertEquals(
            observation?.subject?.identifier?.value,
            patientIdentifier.value,
            "Should match the identifier value",
        );
    });

    it("Should not find observations with matching subject reference but no identifier", async () => {
        const patientIdentifier = {
            system: "http://example.org/fhir/mrn",
            value: uniqueString("67890"),
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestObservation(context, patient.id!, {
            subject: {
                reference: `Patient/${patient.id}`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:identifier=${
                encodeURIComponent(patientIdentifier.system)
            }|${patientIdentifier.value}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry?.length,
            0,
            "Should not find any observations",
        );
    });

    it("Should handle partial identifier matches correctly", async () => {
        const patientIdentifier = {
            system: "http://example.org/fhir/mrn",
            value: uniqueString("13579"),
        };

        const patient = await createTestPatient(context, {
            identifier: [patientIdentifier],
        });

        await createTestObservation(context, patient.id!, {
            subject: {
                reference: `Patient/${patient.id}`,
                identifier: patientIdentifier,
            },
        });

        // Test with only system
        const responseSystem = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:identifier=${
                encodeURIComponent(patientIdentifier.system)
            }|`,
        });

        assertEquals(
            responseSystem.status,
            200,
            "Server should process search with only system successfully",
        );
        const bundleSystem = responseSystem.jsonBody as Bundle;
        assertExists(bundleSystem.entry, "Bundle should contain entries");
        assertEquals(
            bundleSystem.entry?.length,
            1,
            "Should find one observation when searching with only system",
        );

        // Test with only value
        const responseValue = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?subject:identifier=|${patientIdentifier.value}`,
        });

        assertEquals(
            responseValue.status,
            200,
            "Server should process search with only value successfully",
        );
        const bundleValue = responseValue.jsonBody as Bundle;
        assertExists(bundleValue.entry, "Bundle should contain entries");
        assertEquals(
            bundleValue.entry?.length,
            1,
            "Should find one observation when searching with only value",
        );
    });

    it("Should reject identifier modifier on non-reference search parameters", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?name:identifier=http://example.org/fhir/mrn|12345`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject identifier modifier on non-reference search parameters",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });

    it("Should not support chaining with identifier modifier", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:identifier.name=John`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject chaining with identifier modifier",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });

    it("Should not support identifier modifier on canonical elements", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `StructureDefinition?url:identifier=http://example.org/fhir/StructureDefinition/custom-patient`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject identifier modifier on canonical elements",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });
}
