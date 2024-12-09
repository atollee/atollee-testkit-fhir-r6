// tests/replacing_hyperlinks_and_fullurls.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertNotEquals,
    it,
} from "../../../../deps.test.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";

export function runReplacingHyperlinksAndFullUrlsTests(_context: ITestContext) {
    it("Replace resource references", async () => {
        const patientUuid = "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a";
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: patientUuid,
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        name: [{ family: "Test", given: ["Reference"] }],
                    },
                },
                {
                    request: {
                        method: "POST",
                        url: "Observation",
                    },
                    resource: {
                        resourceType: "Observation",
                        status: "final",
                        code: {
                            coding: [{
                                system: "http://loinc.org",
                                code: "55284-4",
                            }],
                        },
                        subject: {
                            reference: patientUuid,
                        },
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        const patientLocation = responseBundle.entry?.[0].response?.location;
        const observationResource = responseBundle.entry?.[1]
            .resource as Observation;
        assertExists(patientLocation, "Patient location should be provided");
        assertExists(
            observationResource.subject?.reference,
            "Observation should have a subject reference",
        );
        assertNotEquals(
            observationResource.subject?.reference,
            patientUuid,
            "UUID reference should be replaced",
        );
        assertEquals(
            observationResource.subject?.reference,
            patientLocation,
            "Observation subject should reference the created Patient",
        );
    });

    it("Replace URLs in narrative", async () => {
        const binaryUuid = "urn:uuid:3fdc72f4-a11d-4a9d-9260-a9f745779e1d";
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    fullUrl: binaryUuid,
                    request: {
                        method: "POST",
                        url: "Binary",
                    },
                    resource: {
                        resourceType: "Binary",
                        contentType: "image/png",
                        data:
                            "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
                    },
                },
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        text: {
                            status: "generated",
                            div: `<div xmlns="http://www.w3.org/1999/xhtml">
                                <p>Patient with an image</p>
                                <img src="${binaryUuid}" alt="Patient image"/>
                            </div>`,
                        },
                        name: [{ family: "Test", given: ["Narrative"] }],
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.entry?.length,
            2,
            "Response should have 2 entries",
        );

        const binaryLocation = responseBundle.entry?.[0].response?.location;
        assertExists(binaryLocation, "Binary location should be provided");

        // Get the created Patient to verify the narrative
        const patientLocation = responseBundle.entry?.[1].response?.location;
        assertExists(patientLocation, "Patient location should be provided");

        const getPatient = await fetchWrapper({
            authorized: true,
            relativeUrl: patientLocation,
        });

        const patient = getPatient.jsonBody as Patient;
        assertExists(patient.text?.div, "Patient should have narrative text");

        // Original UUID should be replaced
        assertEquals(
            patient.text.div.indexOf(binaryUuid),
            -1,
            "Original UUID should not exist in narrative",
        );

        // Should contain the new Binary URL
        assertNotEquals(
            patient.text.div.indexOf(binaryLocation),
            -1,
            "Narrative should contain the new Binary URL",
        );
    });

    it("Replace URLs with fragment identifiers", async () => {
        const profileUrl =
            "http://example.org/fhir/StructureDefinition/custom-patient-profile";
        const transactionBundle: Bundle = {
            resourceType: "Bundle",
            type: "transaction",
            entry: [
                {
                    request: {
                        method: "POST",
                        url: "Patient",
                    },
                    resource: {
                        resourceType: "Patient",
                        meta: {
                            profile: [`${profileUrl}#some.element.path`],
                        },
                        name: [{ family: "Test", given: ["Profile"] }],
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.status, 200, "Transaction should be successful");
        const responseBundle = response.jsonBody as Bundle;
        assertEquals(
            responseBundle.entry?.length,
            1,
            "Response should have 1 entry",
        );

        const patientResource = responseBundle.entry?.[0].resource as Patient;
        assertExists(
            patientResource.meta?.profile,
            "Patient should have a profile reference",
        );
        assertEquals(
            patientResource.meta?.profile[0],
            `${profileUrl}#some.element.path`,
            "Profile URL with fragment should be preserved",
        );
    });
}
