// tests/utils/resource_creators.ts

import { Address, Practitioner } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { HumanNameOptions, IIdentifierOptions } from "./types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createHumanName } from "./utils.ts";
import { createIdentifierOptions } from "./utils.ts";

interface PractitionerOptions extends IIdentifierOptions {
    name?: HumanNameOptions;
    address?: Address[];
}

export async function createTestPractitioner(
    _context: ITestContext,
    options: PractitionerOptions = {},
): Promise<Practitioner> {
    const defaultName = { family: "TestPractitioner", given: ["Test"] };
    const mergedOptions = {
        ...{ name: defaultName },
        ...options,
        identifier: createIdentifierOptions(options.identifier),
    };

    const newPractitioner: Practitioner = {
        resourceType: "Practitioner",
        name: [createHumanName(mergedOptions.name)],
        identifier: mergedOptions.identifier ||
            [{ value: `practitioner-id-${Date.now()}` }],
        address: mergedOptions.address,
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Practitioner",
        method: "POST",
        body: JSON.stringify(newPractitioner),
    });

    return response.jsonBody as Practitioner;
}
