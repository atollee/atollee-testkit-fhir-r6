// creators/create_location.ts

import { Location, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";
import { assertTrue } from "../../../../deps.test.ts";

interface LocationOptions extends IIdentifierOptions {
    name?: string;
    partOf?: { reference: string };
    address?: {
        city?: string;
        state?: string;
        country?: string;
    };
    position?: {
        latitude: number;
        longitude: number;
    };
    managingOrganization?: Reference | undefined;
}

export async function createTestLocation(
    _context: ITestContext,
    options: LocationOptions,
): Promise<Location> {
    const newLocation: Location = {
        resourceType: "Location",
        name: options.name || "TestLocation",
        partOf: options.partOf,
        identifier: createIdentifierOptions(options.identifier),
        managingOrganization: options.managingOrganization,
    };

    if (options.address) {
        newLocation.address = options.address;
    }

    if (options.position) {
        newLocation.position = options.position;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Location",
        method: "POST",
        body: JSON.stringify(newLocation),
    });

    if (!response.success) {
        console.log(JSON.stringify(response, null, 2));
    }
    assertTrue(response.success, "creation of location was successful");
    return response.jsonBody as Location;
}
