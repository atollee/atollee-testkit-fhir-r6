// tests/conformance_transaction_integrity.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { CapabilityStatement } from "npm:@types/fhir/r4.d.ts";

export function runConformanceTransactionIntegrityTests(_context: ITestContext) {
    it("Conformance - Transaction Integrity Documentation", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(response.status, 200, "CapabilityStatement request should be successful");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Response should be a CapabilityStatement");

        // Check for transaction integrity documentation in the CapabilityStatement
        let transactionIntegrityDocumented = false;

        // Check in the CapabilityStatement.rest array
        capabilityStatement.rest?.forEach(restComponent => {
            // Check in the resource array
            restComponent.resource?.forEach(resource => {
                if (resource.type === "Bundle") {
                    resource.operation?.forEach(operation => {
                        if (operation.name === "transaction" || operation.name === "batch") {
                            assertExists(operation.documentation, `Documentation for ${operation.name} operation should exist`);
                            const docLowerCase = operation.documentation.toLowerCase();
                            assertEquals(
                                docLowerCase.includes("transaction integrity") || 
                                docLowerCase.includes("atomicity") || 
                                docLowerCase.includes("rollback"),
                                true,
                                `Documentation for ${operation.name} operation should mention transaction integrity`
                            );
                            transactionIntegrityDocumented = true;
                        }
                    });
                }
            });

            // Check in the operation array
            restComponent.operation?.forEach(operation => {
                if (operation.name === "transaction" || operation.name === "batch") {
                    assertExists(operation.documentation, `Documentation for ${operation.name} operation should exist`);
                    const docLowerCase = operation.documentation.toLowerCase();
                    assertEquals(
                        docLowerCase.includes("transaction integrity") || 
                        docLowerCase.includes("atomicity") || 
                        docLowerCase.includes("rollback"),
                        true,
                        `Documentation for ${operation.name} operation should mention transaction integrity`
                    );
                    transactionIntegrityDocumented = true;
                }
            });
        });

        // Check in the CapabilityStatement.document array
        capabilityStatement.document?.forEach(doc => {
            const docLowerCase = doc.documentation?.toLowerCase() || "";
            if (docLowerCase.includes("transaction integrity") || 
                docLowerCase.includes("atomicity") || 
                docLowerCase.includes("rollback")) {
                transactionIntegrityDocumented = true;
            }
        });

        assertEquals(transactionIntegrityDocumented, true, "Transaction integrity should be documented in the CapabilityStatement");
    });

    it("Conformance - Transaction Integrity Implementation Details", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "metadata",
        });

        assertEquals(response.status, 200, "CapabilityStatement request should be successful");
        const capabilityStatement = response.jsonBody as CapabilityStatement;
        assertEquals(capabilityStatement.resourceType, "CapabilityStatement", "Response should be a CapabilityStatement");

        // Check for specific implementation details about transaction integrity
        let implementationDetailsDocumented = false;

        const checkDocumentation = (doc: string | undefined) => {
            if (doc) {
                const docLowerCase = doc.toLowerCase();
                if (docLowerCase.includes("all-or-nothing") ||
                    docLowerCase.includes("partial success") ||
                    docLowerCase.includes("error handling") ||
                    docLowerCase.includes("concurrent transactions")) {
                    implementationDetailsDocumented = true;
                }
            }
        };

        // Check in the CapabilityStatement.rest array
        capabilityStatement.rest?.forEach(restComponent => {
            restComponent.resource?.forEach(resource => {
                if (resource.type === "Bundle") {
                    resource.operation?.forEach(operation => {
                        if (operation.name === "transaction" || operation.name === "batch") {
                            checkDocumentation(operation.documentation);
                        }
                    });
                }
            });

            restComponent.operation?.forEach(operation => {
                if (operation.name === "transaction" || operation.name === "batch") {
                    checkDocumentation(operation.documentation);
                }
            });
        });

        // Check in the CapabilityStatement.document array
        capabilityStatement.document?.forEach(doc => {
            checkDocumentation(doc.documentation);
        });

        assertEquals(implementationDetailsDocumented, true, "Specific implementation details about transaction integrity should be documented in the CapabilityStatement");
    });
}