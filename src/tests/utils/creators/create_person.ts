import { Person } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";

export interface PersonOptions extends IIdentifierOptions {
    name?: Array<{ given?: string[]; family?: string }>;
    gender?: "male" | "female" | "other" | "unknown";
}

export async function createTestPerson(
    _context: ITestContext,
    options: PersonOptions = {},
): Promise<Person> {
    const newPerson: Person = {
        resourceType: "Person",
        name: options.name || [{ given: ["Test"], family: "Person" }],
        gender: options.gender || "unknown",
        identifier: createIdentifierOptions(options.identifier),
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Person",
        method: "POST",
        body: JSON.stringify(newPerson),
    });

    return response.jsonBody as Person;
}
