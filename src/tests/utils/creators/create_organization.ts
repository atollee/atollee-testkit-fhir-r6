import {
    Address,
    CodeableConcept,
    ContactPoint,
    Identifier,
    Meta,
    Narrative,
    Organization,
    Reference,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";
import { assertTrue } from "../../../../deps.test.ts";

export interface OrganizationOptions extends IIdentifierOptions {
    name?: string;
    alias?: string[];
    type?: CodeableConcept[];
    telecom?: ContactPoint[];
    address?: Address[];
    partOf?: Reference;
    endPoint?: Reference[];
    active?: boolean;
    identifier?: Identifier[];
    meta?: Meta;
    text?: Narrative;
}

export async function createTestOrganization(
    _context: ITestContext,
    options: OrganizationOptions = {},
): Promise<Organization> {
    const defaultOptions: OrganizationOptions = {
        name: "Test Organization",
        active: true,
        identifier: createIdentifierOptions(options.identifier),
    };
    const mergedOptions = { ...defaultOptions, ...options };
    const newOrganization: Organization = {
        resourceType: "Organization",
        name: mergedOptions.name,
        active: mergedOptions.active,
        identifier: mergedOptions.identifier,
        alias: mergedOptions.alias,
        type: mergedOptions.type,
        telecom: mergedOptions.telecom,
        address: mergedOptions.address,
        partOf: mergedOptions.partOf,
    };

    if (mergedOptions.meta) {
        newOrganization.meta = mergedOptions.meta;
    }
    if (mergedOptions.text) {
        newOrganization.text = mergedOptions.text;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Organization",
        method: "POST",
        body: JSON.stringify(newOrganization),
    });
    assertTrue(response.success, "test organization successfully created");
    return response.jsonBody as Organization;
}
