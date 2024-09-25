import { Config } from "./types.ts";

const debug = true;
const ory = false;
const hapi = false;

const debugConfig: Config = {
    clientId: "SAMPLE_CONFIDENTIAL_CLIENT_ID",
    clientSecret: "bu0WRo3HRiybq0bdw4YdMSR4lzu3paj3",
    scope: "patient/*.read patient/*.write launch/patient",
    redirectUri: "http://localhost:3000/callback",
    authServerUrl: "https://deno.kessel.4pan.de/fhir/atollee/r4",
    fhirServerUrl: "https://deno.kessel.4pan.de/fhir/atollee/r4",
    validPatientId: "355",
    writableValidPatientId: "88",
    xmlSupported: false,
    turtleSupported: false,
    clientDefinedIdsAllowed: true,
    referentialIntegritySupported: false,
    referencesAreVersionSpecific: false,
    authorized: true,
    httpSupported: false,
    defaultPageSize: 20,
    paginationSupported: true,
    userName: "admin",
    password: "password",
};

const prodConfig: Config = {
    clientId: "schule-demo",
    clientSecret: "EuRA4qO816OPwbjUDLk7gwL7yBLwyUFc",
    scope: "patient/*.read patient/*.write launch/patient",
    redirectUri: "http://localhost:3000/callback",
    authServerUrl: "https://test.atollee.com",
    fhirServerUrl: "https://test.atollee.com",
    validPatientId: "355",
    writableValidPatientId: "88",
    xmlSupported: false,
    turtleSupported: false,
    clientDefinedIdsAllowed: true,
    referentialIntegritySupported: false,
    referencesAreVersionSpecific: false,
    authorized: true,
    httpSupported: false,
    defaultPageSize: 20,
    paginationSupported: true,
    userName: "admin",
    password: "password",
};

const oryConfig: Config = {
    clientId: "e15fa4f4-6f41-417b-ae8e-c8dd977cdf92",
    clientSecret: "UwAy8gFmrbn~-bWiL9A86g-sHr",
    scope: "patient/*.read patient/*.write launch/patient",
    redirectUri: "http://localhost:3000/callback",
    authServerUrl: "https://test2.atollee.com/fhir/atollee/r4",
    fhirServerUrl: "https://test2.atollee.com/fhir/atollee/r4",
    validPatientId: "355",
    writableValidPatientId: "88",
    xmlSupported: false,
    turtleSupported: false,
    clientDefinedIdsAllowed: true,
    referentialIntegritySupported: false,
    referencesAreVersionSpecific: false,
    authorized: true,
    httpSupported: false,
    defaultPageSize: 20,
    paginationSupported: true,
    userName: "admin",
    password: "password",
};

const hapiConfig: Config = {
    clientId: "e15fa4f4-6f41-417b-ae8e-c8dd977cdf92",
    clientSecret: "UwAy8gFmrbn~-bWiL9A86g-sHr",
    scope: "patient/*.read patient/*.write launch/patient",
    redirectUri: "http://localhost:3000/callback",
    authServerUrl: "http://localhost:8080/fhir",
    fhirServerUrl: "http://localhost:8080/fhir",
    validPatientId: "355A",
    writableValidPatientId: "85A",
    xmlSupported: true,
    turtleSupported: true,
    clientDefinedIdsAllowed: true,
    referentialIntegritySupported: false,
    referencesAreVersionSpecific: false,
    authorized: false,
    httpSupported: false,
    defaultPageSize: 20,
    paginationSupported: true,
    userName: "admin",
    password: "password",
};
export const CONFIG = hapi
    ? hapiConfig
    : (debug ? debugConfig : (ory ? oryConfig : prodConfig));
