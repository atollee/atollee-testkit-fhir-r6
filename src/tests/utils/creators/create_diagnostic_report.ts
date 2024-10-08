import { DiagnosticReport } from "npm:@types/fhir/r4.d.ts";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";
import { IIdentifierOptions } from "./types.ts";
import { createIdentifierOptions } from "./utils.ts";

export interface DiagnosticReportOptions extends IIdentifierOptions {
    subject: { reference: string };
}

export async function createTestDiagnosticReport(
    _context: ITestContext,
    options: DiagnosticReportOptions,
): Promise<DiagnosticReport> {
    const newDiagnosticReport: DiagnosticReport = {
        resourceType: "DiagnosticReport",
        status: "final",
        code: {
            coding: [{
                system: "http://loinc.org",
                code: "58410-2",
                display:
                    "Complete blood count (hemogram) panel - Blood by Automated count",
            }],
        },
        subject: options.subject,
        issued: new Date().toISOString(),
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "DiagnosticReport",
        method: "POST",
        body: JSON.stringify(newDiagnosticReport),
    });

    return response.jsonBody as DiagnosticReport;
}
