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
