import type { Resource } from "npm:@types/fhir/r4.d.ts";

export interface Config {
    clientId: string;
    clientSecret: string;
    scope: string;
    redirectUri: string;
    authServerUrl: string;
    fhirServerUrl: string;
    validPatientId: string;
    writableValidPatientId: string;
    xmlSupported: boolean;
    turtleSupported: boolean;
    clientDefinedIdsAllowed: boolean;
    referentialIntegritySupported: boolean;
    referencesAreVersionSpecific: boolean;
    authorized: boolean;
    httpSupported: boolean;
    defaultPageSize: number;
    paginationSupported: boolean;
    userName: string;
    password: string;
}

export interface IFetchOptions extends RequestInit {
    authorized?: boolean;
    relativeUrl: string;
    overrideBaseUrl?: string;
    body?: string | undefined;
}

export interface IFetchResponse {
    success: boolean;
    status: number;
    error?: unknown | undefined;
    jsonParsed: boolean;
    headers: Headers;
    jsonBody: Resource | null;
    rawBody: string;
}

export interface ITestContext {
    getDefaultPageSize(): number;
    isPaginationSupported(): boolean;
    isHttpSupported(): boolean;
    isClientDefinedIdsAllowed(): boolean;
    getWritableValidPatient(): string;
    getAccessToken(): string;
    getBaseUrl(): string;
    getValidPatientId(): string;
    getValidTimezone(): string;
    isXmlSupported(): boolean;
    isTurtleSupported(): boolean;
    isReferentialIntegritySupported(): boolean;
    areReferencesVersionSpecific(): boolean;
}
