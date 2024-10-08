// creators/create_test_group.ts

import { Group, Reference } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { fetchWrapper } from "../fetch.ts";
import { createIdentifierOptions } from "./utils.ts";
import { IIdentifierOptions } from "./types.ts";

export interface GroupOptions extends IIdentifierOptions {
    name?: string;
    type: Group["type"];
    actual: boolean;
    quantity?: number;
    characteristic?: Array<{
        code: {
            coding: Array<{
                system: string;
                code: string;
                display?: string;
            }>;
        };
        valueBoolean?: boolean;
        valueCodeableConcept?: {
            coding: Array<{
                system: string;
                code: string;
                display?: string;
            }>;
        };
        valueQuantity?: {
            value: number;
            unit: string;
            system: string;
            code: string;
        };
        valueRange?: {
            low: {
                value: number;
                unit: string;
                system: string;
                code: string;
            };
            high: {
                value: number;
                unit: string;
                system: string;
                code: string;
            };
        };
        exclude?: boolean;
    }>;
    member?: Array<{
        entity: Reference;
        period?: {
            start?: string;
            end?: string;
        };
        inactive?: boolean;
    }>;
}

export async function createTestGroup(
    _context: ITestContext,
    options: GroupOptions,
): Promise<Group> {
    const defaultOptions: Partial<GroupOptions> = {
        name: `TestGroup-${Date.now()}`,
        type: "person",
        actual: true,
        identifier: createIdentifierOptions(options.identifier),
    };

    const mergedOptions = { ...defaultOptions, ...options };

    const newGroup: Group = {
        resourceType: "Group",
        name: mergedOptions.name,
        type: mergedOptions.type,
        actual: mergedOptions.actual,
    };

    if (mergedOptions.quantity !== undefined) {
        newGroup.quantity = mergedOptions.quantity;
    }

    if (mergedOptions.characteristic) {
        newGroup.characteristic = mergedOptions.characteristic.map((char) => ({
            ...char,
            exclude: char.exclude !== undefined ? char.exclude : false,
        }));
    }

    if (mergedOptions.member) {
        newGroup.member = mergedOptions.member;
    }

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Group",
        method: "POST",
        body: JSON.stringify(newGroup),
    });

    return response.jsonBody as Group;
}
