// Update this in your resource_creators.ts file or in create_care_team.ts

import {
    CareTeam,
    CareTeamParticipant,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface CareTeamOptions {
    status?: CareTeam["status"];
    name?: string;
    subject?: Reference;
    participant?: Array<CareTeamParticipant>;
}

export async function createTestCareTeam(
    context: ITestContext,
    options: CareTeamOptions = {},
): Promise<CareTeam> {
    const newCareTeam: CareTeam = {
        resourceType: "CareTeam",
        status: options.status || "active",
        name: options.name || `Test CareTeam ${Date.now()}`,
        subject: options.subject ||
            { reference: `Patient/${context.getValidPatientId()}` },
    };

    if (options.participant) {
        newCareTeam.participant = options.participant;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "CareTeam",
        method: "POST",
        body: JSON.stringify(newCareTeam),
    });

    return response.jsonBody as CareTeam;
}
