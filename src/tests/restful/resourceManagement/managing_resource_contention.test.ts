// tests/managing_resource_contention.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, it } from "../../../../deps.test.ts";
import { Patient } from "npm:@types/fhir/r4.d.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";

export function runManagingResourceContentionTests(context: ITestContext) {
    it("Resource Contention - ETag header in response", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        assertEquals(
            response.success,
            true,
            "Read request should be successful",
        );
        assertExists(
            response.headers.get("ETag"),
            "Response should include an ETag header",
        );
        const etag = response.headers.get("ETag");
        assertEquals(
            etag?.startsWith('W/"'),
            true,
            'ETag should start with W/"',
        );
        assertEquals(etag?.endsWith('"'), true, 'ETag should end with "');
    });

    it("Resource Contention - Successful update with If-Match", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const etag = initialResponse.headers.get("ETag");

        // Now, update the patient with If-Match
        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": etag!,
            },
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            true,
            "Update with correct ETag should be successful",
        );
        assertEquals(
            updateResponse.status,
            200,
            "Should return 200 OK for successful update",
        );
    });

    it("Resource Contention - Failed update with incorrect If-Match", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const incorrectEtag = 'W/"incorrect-version"';

        // Now, try to update the patient with incorrect If-Match
        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": incorrectEtag,
            },
            body: JSON.stringify(updatedPatient),
        });

        assertEquals(
            updateResponse.success,
            false,
            "Update with incorrect ETag should fail",
        );
        assertEquals(
            updateResponse.status,
            412,
            "Should return 412 Precondition Failed for incorrect ETag",
        );
    });

    it("Resource Contention - Concurrent update simulation", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        // First, get the current version
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const initialEtag = initialResponse.headers.get("ETag");

        // Simulate first client update
        const firstClientUpdate: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const firstUpdateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": initialEtag!,
            },
            body: JSON.stringify(firstClientUpdate),
        });

        assertEquals(
            firstUpdateResponse.success,
            true,
            "First client update should be successful",
        );

        // Simulate second client update (using old ETag)
        const secondClientUpdate: Patient = {
            ...initialPatient,
            gender: initialPatient.gender === "male" ? "female" : "male",
        };

        const secondUpdateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            headers: {
                "If-Match": initialEtag!,
            },
            body: JSON.stringify(secondClientUpdate),
        });

        assertEquals(
            secondUpdateResponse.success,
            false,
            "Second client update should fail",
        );
        assertEquals(
            secondUpdateResponse.status,
            412,
            "Should return 412 Precondition Failed for outdated ETag",
        );
    });

    it("Resource Contention - Update without If-Match header", async () => {
        const validPatient = await createTestPatient(context);
        const validPatientId = validPatient.id;
        const initialResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
        });

        const initialPatient = initialResponse.jsonBody as Patient;
        const updatedPatient: Patient = {
            ...initialPatient,
            active: !initialPatient.active,
        };

        const updateResponse = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${validPatientId}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        // Note: The behavior here can vary. Some servers might accept the update,
        // while others might require the If-Match header.
        if (updateResponse.status === 400) {
            assertEquals(
                updateResponse.success,
                false,
                "Update without If-Match should be rejected",
            );
            assertEquals(
                updateResponse.status,
                400,
                "Should return 400 Bad Request for missing If-Match header",
            );
        } else {
            assertEquals(
                updateResponse.success,
                true,
                "Update without If-Match should be successful",
            );
            assertEquals(
                updateResponse.status,
                200,
                "Should return 200 OK for successful update",
            );
        }
    });
}
