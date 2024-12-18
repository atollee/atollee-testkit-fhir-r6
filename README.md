# atollee FHIR R6 (Preview) Server Testkit

This kit provides a comprehensive suite of tests for FHIR implementations, featuring OAuth 2.0 authentication, FHIR operations, and configurable settings. It helps implementers ensure compliance with the FHIR R6 Ballot (2nd Draft) specification and follow best practices.

## Features

- Extensive test coverage for FHIR R6 operations
- OAuth 2.0 authentication support with browser automation
- Configurable settings for diverse server capabilities
- Batch and transaction testing
- CRUD operations (Create, Read, Update, Delete)
- Search and history operations
- Conditional operations and references
- Pagination testing
- Custom headers and test rendering for HTTP interactions

## Prerequisites

- [Deno](https://deno.land/) (version 1.31.0 or higher)
- A FHIR R6 server
- OAuth 2.0 credentials (if authentication is required)

## Setup

1. Clone the repository:
   ```
   git clone https://github.com/atollee/fhir-rest-testkit.git
   cd fhir-rest-testkit
   ```
2. Create a `config.ts` file:
   ```
   cp src/tests/config.dist.ts src/tests/config.ts
   ```
3. Edit `config.ts` with your server details and OAuth credentials.

## Configuration

The `config.ts` file includes settings like:

- OAuth details (`clientId`, `clientSecret`, `scope`, `redirectUri`, etc.)
- FHIR server details (`fhirServerUrl`, `validPatientId`, etc.)
- Supported features (`xmlSupported`, `paginationSupported`, etc.)

Refer to `src/tests/types.ts` for detailed options.

## OAuth Authentication

Browser automation supports OAuth login flows, including Keycloak and similar systems. Update `test/utils/oauth.ts` if adjustments are needed for specific forms.

## Running the Tests

Below are test command comparisons for `restful` and `search` test categories:

| Restful Tests                                | Search Tests                               |
|---------------------------------------------|--------------------------------------------|
| `deno task test:restful:init`               | `deno task test:search:init`              |
| `deno task test:restful`                    | `deno task test:search`                   |
| `deno task test:restful:junit`              | `deno task test:search:junit`             |
| `deno task test:restful:json`               | `deno task test:search:json`              |
| `deno task test:restful:json custom.json`   | `deno task test:search:json custom.json`  |

## Test Categories

The testkit aims to provide as complete coverage as possible of the [HL7 FHIR RESTful API (3.2.0)](https://hl7.org/fhir/6.0.0-ballot2/http.html) and [Search (3.2.1)](https://hl7.org/fhir/6.0.0-ballot2/search.html) sections of the specification.

## Contributing

Contributions are welcome. Update tests and documentation as necessary when introducing new features or fixes.

## License

[Apache 2.0 License](LICENSE)

## Disclaimer

This testkit is community-driven and provided as-is. Refer to the official FHIR specification for authoritative guidance.

## Support

For issues or questions, open an issue in the GitHub repository.

Happy testing!
