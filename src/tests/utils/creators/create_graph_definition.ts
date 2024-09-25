// Add this to your resource_creators.ts file

import { GraphDefinition } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface GraphDefinitionOptions {
    name: string;
    start: string;
    link: Array<{
        path: string;
        target: Array<{
            type: string;
            params: string;
        }>;
    }>;
}

export async function createTestGraphDefinition(
    _context: ITestContext,
    options: GraphDefinitionOptions,
): Promise<GraphDefinition> {
    const newGraphDefinition: GraphDefinition = {
        resourceType: "GraphDefinition",
        name: options.name,
        status: "active",
        start: options.start,
        link: options.link,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "GraphDefinition",
        method: "POST",
        body: JSON.stringify(newGraphDefinition),
    });

    return response.jsonBody as GraphDefinition;
}
