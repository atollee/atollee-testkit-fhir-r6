// tests/conditional_patch.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";

export function runConditionalPatchTests(context: ITestContext) {
    it("Conditional Patch - One match", async () => {
        // First, create a patient with a unique identifier
        const uniqueIdentifier = `unique-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: uniqueIdentifier }],
            active: false,
        };

        const createResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        assertEquals(createResponse.success, true, "Patient creation should be successful");

        // Now, perform a conditional patch
        const jsonPatch = [
            { op: "replace", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(jsonPatch),
        });

        assertEquals(patchResponse.success, true, "Conditional patch should be successful");
        assertEquals(patchResponse.status, 200, "Should return 200 OK for successful conditional patch");

        const patchedPatient = patchResponse.jsonBody as Patient;
        assertEquals(patchedPatient.active, true, "Active status should be set to true");
    });

    it("Conditional Patch - No matches", async () => {
        const nonExistentIdentifier = "non-existent-identifier";
        const jsonPatch = [
            { op: "replace", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${nonExistentIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(jsonPatch),
        });

        assertEquals(patchResponse.success, false, "Conditional patch with no matches should fail");
        assertEquals(patchResponse.status, 404, "Should return 404 Not Found for no matches");
    });

    it("Conditional Patch - Multiple matches", async () => {
        // Create multiple patients with the same identifier
        const commonIdentifier = `common-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: commonIdentifier }],
            active: false,
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        // Now, perform a conditional patch
        const jsonPatch = [
            { op: "replace", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${commonIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(jsonPatch),
        });

        assertEquals(patchResponse.success, false, "Conditional patch with multiple matches should fail");
        assertEquals(patchResponse.status, 412, "Should return 412 Precondition Failed for multiple matches");
    });

    it("Conditional Patch - Narrative safety", async () => {
        // Create a patient with a narrative
        const uniqueIdentifier = `narrative-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: uniqueIdentifier }],
            text: {
                status: "generated",
                div: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Patient narrative</div>"
            },
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        // Attempt to patch the narrative
        const jsonPatch = [
            { op: "replace", path: "/text/div", value: "<div xmlns=\"http://www.w3.org/1999/xhtml\">Modified narrative</div>" },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(jsonPatch),
        });

        // The server's behavior may vary. It might reject the patch, regenerate the narrative, or accept the change.
        // Adjust the assertions based on your server's expected behavior.
        if (patchResponse.status === 200) {
            const patchedPatient = patchResponse.jsonBody as Patient;
            assertExists(patchedPatient.text, "Narrative should still exist");
            assertExists(patchedPatient.text.div, "Narrative div should exist");
        } else {
            assertEquals(patchResponse.status, 422, "Server might reject narrative modification");
        }
    });

    it("Conditional Patch - XML Patch with namespaces", async () => {
        const uniqueIdentifier = `xml-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: uniqueIdentifier }],
            name: [{ family: "Doe", given: ["John"] }],
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        const xmlPatch = `
            <diff xmlns="http://www.w3.org/1999/xhtml">
                <replace sel="/f:Patient/f:name/f:given/@value">Jane</replace>
            </diff>
        `;

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/xml-patch+xml",
            },
            body: xmlPatch,
        });

        if (context.isXmlSupported()) {
            assertEquals(patchResponse.success, true, "XML Patch with namespaces should be successful");
            assertEquals(patchResponse.status, 200, "Should return 200 OK for successful XML patch");

            const patchedPatient = patchResponse.jsonBody as Patient;
            assertEquals(patchedPatient.name?.[0].given?.[0], "Jane", "Given name should be updated to Jane");
        } else {
            assertEquals(patchResponse.success, false, "XML is not supported so XML Patch should fail");
        }
    });

    it("Conditional Patch - Failing JSON Patch test operation", async () => {
        const uniqueIdentifier = `test-op-${Date.now()}`;
        const newPatient: Patient = {
            resourceType: "Patient",
            identifier: [{ system: "http://example.com/identifier", value: uniqueIdentifier }],
            active: false,
        };

        await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient",
            method: "POST",
            body: JSON.stringify(newPatient),
        });

        const jsonPatch = [
            { op: "test", path: "/active", value: true },  // This test will fail
            { op: "replace", path: "/active", value: true },
        ];

        const patchResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?identifier=${uniqueIdentifier}`,
            method: "PATCH",
            headers: {
                "Content-Type": "application/json-patch+json",
            },
            body: JSON.stringify(jsonPatch),
        });

        assertEquals(patchResponse.success, false, "Patch with failing test operation should fail");
        assertEquals(patchResponse.status, 422, "Should return 422 Unprocessable Entity for failing test operation");
    });
}
