// creators/create_implementation_guide.ts

import { ImplementationGuide } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createTestIdentifierString } from "./utils.ts";

export interface ImplementationGuideOptions {
    url: string;
    name: string;
    status?: "draft" | "active" | "retired" | "unknown";
    dependsOn?: Array<{
        uri: string;
    }>;
}

export async function createTestImplementationGuide(
    _context: ITestContext,
    options: ImplementationGuideOptions,
): Promise<ImplementationGuide> {
    const newImplementationGuide: ImplementationGuide = {
        resourceType: "ImplementationGuide",
        url: options.url,
        name: options.name,
        status: options.status || "active",
        dependsOn: options.dependsOn,
        fhirVersion: ["4.0.0"],
        packageId: createTestIdentifierString(),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "ImplementationGuide",
        method: "POST",
        body: JSON.stringify(newImplementationGuide),
    });

    return response.jsonBody as ImplementationGuide;
}
