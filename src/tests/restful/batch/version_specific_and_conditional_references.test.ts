// tests/version_specific_and_conditional_references.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertNotEquals, assertTrue, it } from "../../../../deps.test.ts";
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";

export function runVersionSpecificAndConditionalReferencesTests(context: ITestContext) {
    it("Version-specific reference with resolve-as-version-specific extension", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Version"] }]
                    }
                },
                {
                    request: {
                        method: "POST",
                        url: "Observation"
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{ system: "http://loinc.org", code: "55284-4" }]
                        },
                        subject: {
                            reference: "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
                            extension: [{
                                url: "http://hl7.org/fhir/StructureDefinition/resolve-as-version-specific",
                                valueBoolean: true
                            }]
                        }
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.entry?.length, 2, "Response should have 2 entries");

        const patientLocation = responseBundle.entry?.[0].response?.location;
        const observationResource = responseBundle.entry?.[1].resource as Observation;
        assertExists(patientLocation, "Patient location should be provided");
        assertExists(observationResource.subject?.reference, "Observation should have a subject reference");
        assertNotEquals(observationResource.subject?.reference, "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a", "UUID reference should be replaced");
        assertEquals(observationResource.subject?.reference.startsWith(patientLocation!), true, "Observation subject should reference the created Patient");
        if (context.areReferencesVersionSpecific()) {
            assertEquals(observationResource.subject?.reference.includes("/_history/"), true, "Reference should be version-specific");
        }
    });

    it("Conditional reference", async () => {
        // First, create a patient with a specific identifier
        const patientIdentifier = "test-patient-" + Date.now();
        const createPatientBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient"
                    },
                    resource: {
                        resourceType: "Patient",
                        identifier: [{
                            system: "http://example.com/identifiers",
                            value: patientIdentifier
                        }],
                        name: [{ family: "Test", given: ["Conditional"] }]
                    }
                }
            ]
        };

        const patientCreateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(createPatientBundle),
        });
        assertEquals(patientCreateResponse.status, 200, "Patient should be created");

        // Now, create an observation with a conditional reference to the patient
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Observation"
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{ system: "http://loinc.org", code: "55284-4" }]
                        },
                        subject: {
                            reference: `Patient?identifier=http://example.com/identifiers|${patientIdentifier}`
                        }
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(responseBundle.entry?.length, 1, "Response should have 1 entry");

        const observationResource = responseBundle.entry?.[0].resource as Observation;
        assertExists(observationResource.subject?.reference, "Observation should have a subject reference");
        assertNotEquals(observationResource.subject?.reference, `Patient?identifier=http://example.com/identifiers|${patientIdentifier}`, "Conditional reference should be resolved");
        assertTrue(observationResource.subject?.reference.indexOf("/Patient/") !== -1, "Resolved reference should point to a Patient resource");
    });

    it("Conditional reference - no match", async () => {
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Observation"
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{ system: "http://loinc.org", code: "55284-4" }]
                        },
                        subject: {
                            reference: "Patient?identifier=http://example.com/identifiers|non-existent-patient"
                        }
                    }
                }
            ]
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 400, "Transaction should fail due to unresolved conditional reference");
    });
}