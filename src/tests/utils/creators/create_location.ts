// creators/create_location.ts

import { Location } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";

interface LocationOptions {
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
}

export async function createTestLocation(
    _context: ITestContext,
    options: LocationOptions = {
        name: "TestLocation",
    },
): Promise<Location> {
    const newLocation: Location = {
        resourceType: "Location",
        name: options.name || "TestLocation",
        partOf: options.partOf,
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

    return response.jsonBody as Location;
}
