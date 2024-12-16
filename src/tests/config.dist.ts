import { Config } from "./types.ts";

export const CONFIG: Config = {
    // client id from configured oauth server
    clientId: "",
    // client secret from configured oauth server
    clientSecret: "",
    scope: "patient/*.read patient/*.write launch/patient",
    // callback url to receive oauth
    redirectUri: "",
    // r4 server url (for authentication requests)
    authServerUrl: "",
    // r4 server url (for all other requests)
    fhirServerUrl: "",
    validPatientId: "355",
    writableValidPatientId: "88",
    xmlSupported: false,
    turtleSupported: false,
    clientDefinedIdsAllowed: true,
    referentialIntegritySupported: false,
    referencesAreVersionSpecific: false,
    defaultPageSize: 20,
    paginationSupported: true,
    authorized: false,
    httpSupported: false,
    userName: "admin",
    password: "password",
    serverTimeZone: "Europe/Berlin",
    transactionSupported: false,
};
