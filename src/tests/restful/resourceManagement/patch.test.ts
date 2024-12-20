// tests/patch.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Parameters, Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runPatchTests(context: ITestContext) {
    it("Patch - JSON Patch", async () => {
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Create"] }],
            telecom: [],
            active: false,
        };
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            initialResponse.success,
            true,
            "succeeded in creating a new patient",
        );
        const initialPatient = initialResponse.jsonBody as Patient;
        const etag = initialResponse.headers.get("ETag");

        const jsonPatch = [
            { op: "replace", path: "/active", value: !initialPatient.active },
            {
                op: "add",
                path: "/telecom/0",
                value: { system: "phone", value: "555-1234" },
            },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${initialPatient.id}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
                "If-Match": etag!,
            },
            body: JSON.stringify(jsonPatch),
        });
        assertEquals(
            patchResponse.success,
            true,
            "JSON Patch should be successful",
        );
        assertEquals(
            patchResponse.status,
            200,
            "Should return 200 OK for successful patch",
        );

        const patchedPatient = patchResponse.jsonBody as Patient;
        assertEquals(
            patchedPatient.active,
            !initialPatient.active,
            "Active status should be toggled",
        );
        assertExists(patchedPatient.telecom?.[0], "Telecom should be added");
        assertEquals(
            patchedPatient.telecom?.[0].value,
            "555-1234",
            "Phone number should be added",
        );
    });

    it("Patch - XML Patch", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            headers: {
                "Accept": "application/fhir+xml",
            },
        });

        const etag = initialResponse.headers.get("ETag");

        const xmlPatch = `
            <diff xmlns="http://www.w3.org/1999/xhtml">
                <replace sel="Patient/active/@value">false</replace>
                <add sel="Patient">
                    <telecom>
                        <system value="phone"/>
                        <value value="555-5678"/>
                    </telecom>
                </add>
            </diff>
        `;

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/xml-patch+xml",
                "If-Match": etag!,
            },
            body: xmlPatch,
        });

        if (context.isXmlSupported()) {
            assertEquals(
                patchResponse.success,
                true,
                "XML Patch should be successful",
            );
            assertEquals(
                patchResponse.status,
                200,
                "Should return 200 OK for successful patch",
            );

            // Fetch the updated resource to verify changes
            const updatedResponse = await fetchWrapper({
                authorized: true,
                relativeUrl: `Patient/${validPatientId}`,
            });

            const updatedPatient = updatedResponse.jsonBody as Patient;
            assertEquals(
                updatedPatient.active,
                false,
                "Active status should be set to false",
            );
            assertExists(
                updatedPatient.telecom?.find((t) => t.value === "555-5678"),
                "New phone number should be added",
            );
        } else {
            assertEquals(
                patchResponse.success,
                false,
                "XML is not supported, so XML Patch needs to fail",
            );
        }
    });

    it("Patch - FHIRPath Patch", async () => {
        // First, get the current version
        const newPatient = {
            resourceType: "Patient",
            name: [{ family: "Test", given: ["Create"] }],
            telecom: [{}],
            active: false,
        };
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(
            initialResponse.success,
            true,
            "succeeded in creating a new patient",
        );

        const initialPatient = initialResponse.jsonBody as Patient;
        const etag = initialResponse.headers.get("ETag");

        const fhirPathPatch: Parameters = {
            resourceType: "Parameters",
            parameter: [
                {
                    name: "operation",
                    part: [
                        { name: "type", valueCode: "replace" },
                        { name: "path", valueString: "Patient.active" },
                        { name: "value", valueBoolean: true },
                    ],
                },
                {
                    name: "operation",
                    part: [
                        { name: "type", valueCode: "add" },
                        { name: "path", valueString: "Patient.telecom" },
                        {
                            name: "value",
                            valueContactPoint: {
                                system: "email",
                                value: "test@example.com",
                            },
                        },
                    ],
                },
            ],
        };

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${initialPatient.id}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/fhir+json",
                "If-Match": etag!,
            },
            body: JSON.stringify(fhirPathPatch),
        });

        assertEquals(
            patchResponse.success,
            true,
            "FHIRPath Patch should be successful",
        );
        assertEquals(
            patchResponse.status,
            200,
            "Should return 200 OK for successful patch",
        );

        const patchedPatient = patchResponse.jsonBody as Patient;
        assertEquals(
            patchedPatient.active,
            true,
            "Active status should be set to true",
        );
        assertExists(
            patchedPatient.telecom?.find((t) => t.value === "test@example.com"),
            "Email should be added",
        );
    });

    it("Patch - Version conflict", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const outdatedEtag = 'W/"outdated-version"';

        const jsonPatch = [
            { op: "replace", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
                "If-Match": outdatedEtag,
            },
            body: JSON.stringify(jsonPatch),
        });

        assertEquals(
            patchResponse.success,
            false,
            "Patch with outdated ETag should fail",
        );
        assertEquals(
            patchResponse.status,
            412,
            "Should return 412 Precondition Failed for version conflict",
        );
    });

    it("Patch - Invalid patch document", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        const invalidJsonPatch = [
            { op: "invalid", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(invalidJsonPatch),
        });

        assertEquals(
            patchResponse.success,
            false,
            "Patch with invalid operation should fail",
        );
        assertEquals(
            patchResponse.status,
            422,
            "Should return 422 Unprocessable Entity for invalid patch document",
        );
    });
}
