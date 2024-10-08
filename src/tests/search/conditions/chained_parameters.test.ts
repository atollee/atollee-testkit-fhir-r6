// tests/search/parameters/chained_parameters.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestDiagnosticReport,
    createTestPatient,
    createTestPractitioner,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    DiagnosticReport,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runChainedParametersTests(context: ITestContext) {
    it("Should find DiagnosticReports with chained patient name search", async () => {
        const patientName = uniqueString("Peter");
        const patient = await createTestPatient(context, {
            name: [{ given: [patientName], family: "TestFamily" }],
        });

        const diagnosticReport = await createTestDiagnosticReport(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `DiagnosticReport?subject.name=${patientName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process chained parameter search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DiagnosticReport).id === diagnosticReport.id
            ),
            "Results should include the created DiagnosticReport",
        );
    });

    it("Should find DiagnosticReports with chained patient name search and explicit type", async () => {
        const patientName = uniqueString("John");
        const patient = await createTestPatient(context, {
            name: [{ given: [patientName], family: "TestFamily" }],
        });

        const diagnosticReport = await createTestDiagnosticReport(context, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `DiagnosticReport?subject:Patient.name=${patientName}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process chained parameter search with explicit type successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.some((entry) =>
                (entry.resource as DiagnosticReport).id === diagnosticReport.id
            ),
            "Results should include the created DiagnosticReport",
        );
    });

    if (context.isHapiBugsDisallowed()) {
        it("Should handle multiple independent chained parameters", async () => {
            const practitionerName = uniqueString("Joe");
            const practitionerJoe = await createTestPractitioner(context, {
                name: { given: [practitionerName], family: "Smith" },
                address: [{ state: "CA" }],
            });

            const practitionerState = uniqueString("MN");
            const practitionerJane = await createTestPractitioner(context, {
                name: { given: ["Jane"], family: "Doe" },
                address: [{ state: practitionerState }],
            });

            const patientWithJoe = await createTestPatient(context, {
                name: { given: ["Patient"], family: "WithJoe" },
                generalPractitioner: [{
                    reference: `Practitioner/${practitionerJoe.id}`,
                }],
            });

            const patientWithJane = await createTestPatient(context, {
                name: [{ given: ["Patient"], family: "WithJane" }],
                generalPractitioner: [{
                    reference: `Practitioner/${practitionerJane.id}`,
                }],
            });

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Patient?general-practitioner.name=${practitionerName}&general-practitioner.address-state=${practitionerState}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process multiple independent chained parameter search successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                2,
                "Results should include both patients, each matching one of the criteria",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Patient).id === patientWithJoe.id
                ),
                "Results should include the patient with Joe as GP (matching name criterion)",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    (entry.resource as Patient).id === patientWithJane.id
                ),
                "Results should include the patient with Jane as GP (matching address-state criterion)",
            );
        });
    }

    if (context.isRejectSearchWithAmbiguousResourceTypesSupported()) {
        it("Should reject search with ambiguous resource types in chained parameters", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `DiagnosticReport?subject.name=TestName`,
            });

            assertEquals(
                response.status,
                400,
                "Server should reject search with ambiguous resource types",
            );
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertExists(
                operationOutcome.issue,
                "OperationOutcome should contain issues",
            );
            assertTrue(
                operationOutcome.issue.some((issue) =>
                    issue.severity === "error"
                ),
                "OperationOutcome should contain an error",
            );
        });
    }
}
