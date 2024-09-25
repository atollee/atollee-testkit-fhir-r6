import { Procedure } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface ProcedureOptions {
    code?: string;
    performedDateTime?: string;
    location?: { reference: string };
}

export async function createTestProcedure(
    context: ITestContext,
    options: ProcedureOptions = {},
): Promise<Procedure> {
    const newProcedure: Procedure = {
        resourceType: "Procedure",
        status: "completed",
        code: {
            coding: [{
                system: "http://snomed.info/sct",
                code: options.code || "80146002",
                display: options.code
                    ? `Test Procedure ${options.code}`
                    : "Appendectomy",
            }],
        },
        subject: { reference: `Patient/${context.getValidPatientId()}` },
        performedDateTime: options.performedDateTime ||
            new Date().toISOString(),
        location: options.location,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Procedure",
        method: "POST",
        body: JSON.stringify(newProcedure),
    });

    return response.jsonBody as Procedure;
}
