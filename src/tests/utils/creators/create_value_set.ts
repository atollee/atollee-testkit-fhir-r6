// creators/create_value_set.ts

import { ValueSet } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface ValueSetOptions {
    id?: string; // Add this line
    url: string;
    name?: string;
    status?: "draft" | "active" | "retired" | "unknown";
    compose?: {
        include: Array<{
            system: string;
            concept?: Array<{
                code: string;
                display?: string;
            }>;
        }>;
    };
}

export async function createTestValueSet(
    _context: ITestContext,
    options: ValueSetOptions,
): Promise<ValueSet> {
    const newValueSet: ValueSet = {
        resourceType: "ValueSet",
        id: options.id, // Add this line
        url: options.url,
        name: options.name || `TestValueSet-${Date.now()}`,
        status: options.status || "active",
        compose: options.compose,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: options.id ? `ValueSet/${options.id}` : "ValueSet", // Update this line
        method: options.id ? "PUT" : "POST", // Update this line
        body: JSON.stringify(newValueSet),
    });

    return response.jsonBody as ValueSet;
}
