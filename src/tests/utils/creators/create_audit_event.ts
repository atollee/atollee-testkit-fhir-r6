import { AuditEvent } from "npm:@types/fhir";
import { fetchWrapper } from "../fetch.ts";
import { ITestContext } from "../../types.ts";

export async function createTestAuditEvent(
    _context: ITestContext,
    options: {
        entity: Array<{ reference: string }>;
        agent: Array<{ who: { identifier: { value: string } } }>;
    },
): Promise<AuditEvent> {
    const newAuditEvent: AuditEvent = {
        resourceType: "AuditEvent",
        type: {
            system: "http://terminology.hl7.org/CodeSystem/audit-event-type",
            code: "rest",
            display: "RESTful Operation",
        },
        action: "R",
        recorded: new Date().toISOString(),
        outcome: "0",
        agent: options.agent,
        source: {
            observer: { identifier: { value: "test-system" } },
        },
        entity: options.entity,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "AuditEvent",
        method: "POST",
        body: JSON.stringify(newAuditEvent),
    });

    return response.jsonBody as AuditEvent;
}
