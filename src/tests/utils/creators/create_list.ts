// Add this to your resource_creators.ts file or create a new file named create_list.ts

import { List, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";

export interface ListOptions extends IIdentifierOptions {
    status?: "current" | "retired" | "entered-in-error";
    mode?: "working" | "snapshot" | "changes";
    title?: string;
    entry?: Array<{
        item: Reference;
    }>;
}

export async function createTestList(
    _context: ITestContext,
    options: ListOptions,
): Promise<List> {
    const newList: List = {
        resourceType: "List",
        status: options.status || "current",
        mode: options.mode || "working",
        title: options.title || "no title",
        entry: options.entry,
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "List",
        method: "POST",
        body: JSON.stringify(newList),
    });

    return response.jsonBody as List;
}
