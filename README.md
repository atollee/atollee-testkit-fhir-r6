# atollee FHIR R6 (Preview) Server Testkit

This kit provides a comprehensive suite of tests for FHIR implementations, featuring OAuth 2.0 authentication, FHIR interactions, and configurable settings. It helps implementers ensure compliance with the FHIR R6 Ballot (2nd Draft) specification and follow best practices.

## Features

This kit includes a broad array of capabilities, such as:

- Extensive test coverage for FHIR R6 (Preview)
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
   git clone https://github.com/atollee/atollee-testkit-fhir-r6.git
   cd atollee-testkit-fhir-r6
   ```
2. Edit config.ts with your server details and OAuth credentials. You can use any text editor of your choice. For example:
   ```
   nano src/tests/config.ts
   ```

   The `config.ts` file includes settings like:

   - OAuth details (`clientId`, `clientSecret`, `scope`, `redirectUri`, etc.)
   - FHIR server details (`fhirServerUrl`, `validPatientId`, etc.)
   - Supported features (`xmlSupported`, `paginationSupported`, etc.)

   Refer to `src/tests/types.ts` for detailed options.

   
3. Only if changes are required for specific OAuth login flows, modify the `test/utils/oauth.ts` file.

   The current implementation supports browser-automated authentication, including Keycloak and similar systems. This functionality uses [Puppeteer](https://pptr.dev) to launch a browser, such as Chrome or Firefox, to complete the process.



## Running the Tests

Below are test command comparisons for `restful` and `search` test categories:

| Restful Tests                                | Search Tests                               |
|---------------------------------------------|--------------------------------------------|
| `deno task test:restful`                    | `deno task test:search`                   |

**Additional tasks available:** Run `deno task` to view all available options.


## Test Categories

The testkit aims to provide as complete coverage as possible of the [HL7 FHIR RESTful API (3.2.0)](https://hl7.org/fhir/6.0.0-ballot2/http.html) and [Search (3.2.1)](https://hl7.org/fhir/6.0.0-ballot2/search.html) sections of the specification. This coverage can be expanded and is continuously improved by atollee to include additional aspects over time.

## Contributing

Contributions are welcome. Update tests and documentation as necessary when introducing new features or fixes.

## License

[Apache 2.0 License](LICENSE)

## Disclaimer

This testkit is community-driven and provided as-is. Refer to the official FHIR specification for authoritative guidance.

## Support

For issues or questions, open an issue in the GitHub repository.

Happy testing!
