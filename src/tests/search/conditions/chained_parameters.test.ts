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
    uniqueString,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    DiagnosticReport,
    OperationOutcome,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

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
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
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

    it("Should handle multiple independent chained parameters with AND logic", async () => {
        const practitionerName = uniqueString("Joe");
        const practitionerState = uniqueString("MN");
        const practitionerJoe = await createTestPractitioner(context, {
            name: { given: [practitionerName], family: "Smith" },
            address: [{ state: practitionerState }],
        });

        const practitionerJane = await createTestPractitioner(context, {
            name: { given: ["Jane"], family: "Doe" },
            address: [{ state: "CA" }],
        });

        const patientWithJoe = await createTestPatient(context, {
            name: { given: ["Patient"], family: "WithJoe" },
            generalPractitioner: [{
                reference: `Practitioner/${practitionerJoe.id}`,
            }],
        });

        await createTestPatient(context, {
            name: [{ given: ["Patient"], family: "WithJane" }],
            generalPractitioner: [{
                reference: `Practitioner/${practitionerJane.id}`,
            }],
        });

        await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Practitioner?name=${practitionerName}&address-state=${practitionerState}`,
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
            1,
            "Results should include only the patient with a practitioner matching both criteria",
        );
        assertEquals(
            (bundle.entry[0].resource as Patient).id,
            patientWithJoe.id,
            "Result should be the patient with Joe as GP (matching both name and address-state criteria)",
        );
    });

    if (context.isRejectSearchWithAmbiguousResourceTypesSupported()) {
        it("Should handle search with potentially ambiguous resource types in chained parameters", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `DiagnosticReport?subject.name=TestName`,
            });

            assertEquals(
                response.status,
                200,
                "Server should accept and process the search",
            );

            const bundle = response.jsonBody as Bundle;
            assertExists(bundle, "Response should be a Bundle");
            assertEquals(
                bundle.type,
                "searchset",
                "Bundle should be a searchset",
            );

            // Optionally, you might want to check if the server included any warnings
            // about the potentially inefficient search in the Bundle.entry
            const operationOutcome = bundle.entry?.find((entry) =>
                entry.resource?.resourceType === "OperationOutcome"
            )?.resource as OperationOutcome;
            if (operationOutcome) {
                assertTrue(
                    operationOutcome.issue.some((issue) =>
                        issue.severity === "warning" &&
                        issue.code === "processing"
                    ),
                    "Bundle may include a warning about the potentially inefficient search",
                );
            }
        });
    } else {
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
