# atollee Testkit FHIR R6 (Preview) for Servers

This kit runs a comprehensive suite of tests against FHIR implementations, featuring OAuth 2.0 authentication, various FHIR operations, and configurable settings to accommodate different server capabilities. It helps implementers and maintainers ensure their servers comply with the FHIR R6 Ballot (2nd Draft) specification (with substantial support for R4) and follow best practices.

## Features

- Extensive test coverage for FHIR R6 (Preview) operations
- OAuth 2.0 authentication support with browser automation
- Configurable settings to accommodate different server capabilities
- Batch and transaction testing
- Resource creation, reading, updating, and deleting
- Search and history operations
- Conditional operations
- Version-specific and conditional references
- Content type negotiation
- Pagination testing
- Custom header support
- Custom JSON test renderer for storing HTTP interactions

## Prerequisites

- [Deno](https://deno.land/) (version 1.31.0 or higher)
- A FHIR R6 server to test against
- OAuth 2.0 credentials (if your server requires authentication)

## Setup

1. Clone this repository:
```
git clone https://github.com/atollee/fhir-rest-testkit.git
cd fhir-rest-testkit
```

2. Create a `config.ts` file in the `src/tests` directory. Use the `config.dist.ts` file as a template:
```
cp src/tests/config.dist.ts src/tests/config.ts
```

3. Edit the `config.ts` file with your FHIR server details and OAuth 2.0 credentials.

## Configuration

The `config.ts` file contains the following settings:

- `clientId`: The client ID for OAuth 2.0 authentication
- `clientSecret`: The client secret for OAuth 2.0 authentication
- `scope`: The OAuth scopes required for the tests
- `redirectUri`: The callback URL to receive the OAuth code
- `authServerUrl`: The URL of the authorization server
- `fhirServerUrl`: The base URL of your FHIR R4 server
- `userName`: The username for OAuth login (used in browser automation)
- `password`: The password for OAuth login (used in browser automation)
- `validPatientId`: A valid patient ID in your FHIR server for read operations
- `writableValidPatientId`: A valid patient ID that can be modified for write operations
- `xmlSupported`: Set to `true` if your server supports XML format
- `turtleSupported`: Set to `true` if your server supports Turtle format
- `clientDefinedIdsAllowed`: Set to `true` if your server allows clients to define resource IDs
- `referentialIntegritySupported`: Set to `true` if your server enforces referential integrity
- `referencesAreVersionSpecific`: Set to `true` if your server supports version-specific references
- `httpSupported`: Set to `true` if your server supports HTTP (non-HTTPS) connections
- `defaultPageSize`: The default page size for paginated responses
- `paginationSupported`: Set to `true` if your server supports pagination
- `serverTimeZone`: The time zone of your FHIR server
- `transactionSupported`: Set to `true` if your server supports transactions

Please see additional configuration options in the `src/tests/types.ts` file.

### Important Note on `authServerUrl` and `fhirServerUrl`

- If OAuth is integrated into the FHIR server:
  - Set both `authServerUrl` and `fhirServerUrl` to the same URL, pointing to the root of the FHIR server.
- If OAuth is provided by a separate service:
  - Set `authServerUrl` to the URL of the OAuth server.
  - Set `fhirServerUrl` to the root URL of the FHIR server.

## OAuth Authentication

This testkit uses browser automation for OAuth login processes. This allows for testing of real-world OAuth flows, including those that require user interaction.

The browser automation is primarily designed for Keycloak login forms but should work with most other login forms that have a username field, password field, and a login button. 

If the automation doesn't work with your specific login form, you may need to update the automation logic in `test/utils/oauth.ts`.

The `userName` and `password` fields in the CONFIG are used to set the credentials when logging in via browser automation.

## Running the Tests


To run initialization tests to upload initial bundles:
```
deno task test:restful:init
```

To run the entire test suite:

```
deno task test:restful
```

To run the tests with JUnit output format:
```
deno task test:restful:junit
```

To run the tests and store results with HTTP interactions in a JSON file:
```
deno task test:restful:json
```

To run the tests with the custom test renderer and specify a custom filename:
```
deno task test:restful:json custom-results.json
```

## Test Categories

The testkit includes tests for various FHIR operations and features, including:

- Service Base URL
- Resource Metadata and Versioning
- Security
- HTTP Status Codes and Headers
- Content Types and Encodings
- CRUD Operations (Create, Read, Update, Delete)
- Search Operations
- History Operations
- Batch and Transaction Processing
- Conditional Operations
- Version-specific References
- Paging
- Custom Headers

## Contributing

Contributions to improve the testkit are welcome. Please ensure that you update the tests and documentation as necessary when adding new features or fixing bugs.

## License

[Apache 2.0 License](LICENSE)

## Disclaimer

This testkit is provided as-is and is not officially endorsed by HL7 or any other standards body. It is a community-driven project aimed at helping FHIR implementers test their servers. Always refer to the official FHIR specification for authoritative information.

## Support

If you encounter any issues or have questions, please open an issue in the GitHub repository.

Happy testing!
