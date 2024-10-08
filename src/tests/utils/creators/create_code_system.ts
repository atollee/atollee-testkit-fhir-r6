import { CodeSystem } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { IIdentifierOptions } from "./types.ts";
import { createIdentifierOptions } from "../resource_creators.ts";

export interface CodeSystemOptions extends IIdentifierOptions {
    name: string;
    url: string;
    status?: "draft" | "active" | "retired" | "unknown";
    content?:
        | "not-present"
        | "example"
        | "fragment"
        | "complete"
        | "supplement";
}

export async function createTestCodeSystem(
    _context: ITestContext,
    options: CodeSystemOptions,
): Promise<CodeSystem> {
    const newCodeSystem: CodeSystem = {
        resourceType: "CodeSystem",
        name: options.name,
        url: options.url,
        status: options.status || "active",
        content: options.content || "complete",
        concept: [
            {
                code: "test-code",
                display: "Test Code",
            },
        ],
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "CodeSystem",
        method: "POST",
        body: JSON.stringify(newCodeSystem),
    });

    return response.jsonBody as CodeSystem;
}
