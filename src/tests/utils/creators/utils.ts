import { HumanName, Identifier } from "npm:@types/fhir/r4.d.ts";
import { HumanNameOptions, IIdentifierOptions } from "./types.ts";

export function createHumanName(options: HumanNameOptions): HumanName {
    return {
        family: options.family,
        given: options.given,
        prefix: options.prefix,
        suffix: options.suffix,
        text: options.text,
    };
}

let testRandomText = "";

export function createTestIdentifierString() {
    return `test-id-${getRandomText()}`;
}

export function createTestIdentifier(): Identifier {
    return { value: createTestIdentifierString() };
}

export function getRandomText(): string {
    if (!testRandomText) {
        testRandomText = Date.now().toString();
    }
    return testRandomText;
}

export function updateRandomText() {
    testRandomText = Date.now().toString();
}

export function createIdentifierOptions(
    defaultIdentifier: Partial<Identifier>[] | undefined,
    newIdentifier?: Partial<Identifier>[] | undefined,
): Identifier[] {
    return [
        createTestIdentifier(),
        ...(defaultIdentifier ?? []),
        ...(newIdentifier ?? []),
    ];
}

export function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function uniqueNumber(): number {
    return Date.now();
}

/**
 * Generates a random string of alphabetic characters with specified length
 * @param count Total number of characters to generate
 * @param upperCaseCount Number of initial characters that should be uppercase (default: 1)
 * @returns Random string of alphabetic characters
 * @throws Error if upperCaseCount > count or if either parameter is negative
 */
export function uniqueCharacters(count: number, upperCaseCount: number = 1): string {
    if (upperCaseCount > count) {
        throw new Error("Upper case count cannot be greater than total count");
    }

    if (count < 0 || upperCaseCount < 0) {
        throw new Error("Counts cannot be negative");
    }

    // Generate random characters
    const result: string[] = Array.from({ length: count }, () => 
        String.fromCharCode(97 + Math.floor(Math.random() * 26))
    );

    // Convert specified number of characters to uppercase
    for (let i = 0; i < upperCaseCount; i++) {
        result[i] = result[i].toUpperCase();
    }

    return result.join('');
}