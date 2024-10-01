// tests/search/parameters/elements.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runElementsTests(context: ITestContext) {
    it("Should return only specified elements", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
            active: true,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_elements=name,gender`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const returnedPatient = response.jsonBody as Patient;
        assertExists(
            returnedPatient.name,
            "Returned patient should include name",
        );
        assertExists(
            returnedPatient.gender,
            "Returned patient should include gender",
        );
        assertEquals(
            returnedPatient.birthDate,
            undefined,
            "Returned patient should not include birthDate",
        );
        assertEquals(
            returnedPatient.active,
            undefined,
            "Returned patient should not include active",
        );
    });

    it("Should return mandatory elements even if not specified", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_elements=gender`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const returnedPatient = response.jsonBody as Patient;
        assertExists(
            returnedPatient.id,
            "Returned patient should include id (mandatory)",
        );
        assertExists(
            returnedPatient.gender,
            "Returned patient should include gender (requested)",
        );
        assertExists(
            returnedPatient.resourceType,
            "Returned patient should include resourceType (mandatory)",
        );
    });

    it("Should mark resources with SUBSETTED tag when using _elements", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}?_elements=name,gender`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const returnedPatient = response.jsonBody as Patient;
        assertExists(
            returnedPatient.meta?.tag,
            "Returned patient should have tags",
        );
        assertTrue(
            returnedPatient.meta!.tag!.some((tag) => tag.code === "SUBSETTED"),
            "Returned patient should be marked with SUBSETTED tag",
        );
    });

    it("Should apply _elements restrictions to included resources", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"], family: "TestFamily" }],
            gender: "male",
            birthDate: "1990-01-01",
        });

        const observation = await createTestObservation(context, patient.id!, {
            code: "test-code",
            status: "final",
            valueQuantity: { value: 100, unit: "mg" },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_id=${observation.id}&_include=Observation:subject&_elements=Observation.code,Patient.name`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain 2 entries (Observation and Patient)",
        );

        const returnedObservation = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Observation"
        )?.resource as Observation;
        assertExists(
            returnedObservation.code,
            "Returned observation should include code",
        );
        assertEquals(
            returnedObservation.status,
            undefined,
            "Returned observation should not include status",
        );
        assertEquals(
            returnedObservation.valueQuantity,
            undefined,
            "Returned observation should not include valueQuantity",
        );

        const returnedPatient = bundle.entry.find((entry) =>
            entry.resource?.resourceType === "Patient"
        )?.resource as Patient;
        assertExists(
            returnedPatient.name,
            "Returned patient should include name",
        );
        assertEquals(
            returnedPatient.gender,
            undefined,
            "Returned patient should not include gender",
        );
        assertEquals(
            returnedPatient.birthDate,
            undefined,
            "Returned patient should not include birthDate",
        );
    });

    it("Should handle _elements with [x] elements correctly", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "test-code",
            status: "final",
            valueQuantity: { value: 100, unit: "mg" },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation/${observation.id}?_elements=code,value`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request successfully",
        );
        const returnedObservation = response.jsonBody as Observation;
        assertExists(
            returnedObservation.code,
            "Returned observation should include code",
        );
        assertExists(
            returnedObservation.valueQuantity,
            "Returned observation should include valueQuantity",
        );
        assertEquals(
            returnedObservation.status,
            undefined,
            "Returned observation should not include status",
        );
    });
}
