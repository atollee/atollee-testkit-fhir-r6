import { Person } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

export interface PersonOptions {
    name?: Array<{ given?: string[]; family?: string }>;
    identifier?: Array<{ system?: string; value: string }>;
    gender?: "male" | "female" | "other" | "unknown";
}

export async function createTestPerson(
    _context: ITestContext,
    options: PersonOptions = {},
): Promise<Person> {
    const newPerson: Person = {
        resourceType: "Person",
        name: options.name || [{ given: ["Test"], family: "Person" }],
        identifier: options.identifier,
        gender: options.gender || "unknown",
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Person",
        method: "POST",
        body: JSON.stringify(newPerson),
    });

    return response.jsonBody as Person;
}
