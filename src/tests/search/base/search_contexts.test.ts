// tests/search/search_contexts.test.ts

import { ITestContext } from "../../types.ts";
import { assertEquals, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Observation, Patient } from "npm:@types/fhir/r4.d.ts";
import { assertTrue } from "../../../../deps.test.ts";

export function runSearchContextTests(context: ITestContext) {
    if (!context.isTextContentSearchSupported()) {
        return;
    }
    it("Search across all resource types", async () => {
        const patient = await createTestPatient(context, {
            family: "AllResourceTest",
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "all-resource-test",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `_search`,
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `_content=AllResourceTest`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry!.some((e) => e.resource?.resourceType === "Patient"),
        );
        assertTrue(
            bundle.entry!.some((e) =>
                e.resource?.resourceType === "Observation"
            ),
        );
    });

    it("Search across all resource types with _type parameter", async () => {
        const patient = await createTestPatient(context, {
            family: "TypeParameterTest",
        });
        await createTestObservation(context, patient.id!, {
            code: "type-parameter-test",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `?_type=Patient,Observation&_content=TypeParameterTest`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry!.some((e) => e.resource?.resourceType === "Patient"),
        );
        assertTrue(
            bundle.entry!.some((e) =>
                e.resource?.resourceType === "Observation"
            ),
        );
    });

    it("Search on a specified resource type", async () => {
        const patient = await createTestPatient(context, {
            family: "SpecificTypeTest",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?family=SpecificTypeTest`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry![0].resource?.resourceType, "Patient");
        assertEquals((bundle.entry![0].resource as Patient).id, patient.id);
    });

    it("Search in a specified compartment", async () => {
        const patient = await createTestPatient(context, {
            family: "CompartmentTest",
        });
        const observation = await createTestObservation(context, patient.id!, {
            code: "compartment-test",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${patient.id}/Observation?code=compartment-test`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.entry![0].resource?.resourceType, "Observation");
        assertEquals(
            (bundle.entry![0].resource as Observation).id,
            observation.id,
        );
    });

    it("Search in a specified compartment with wildcard type", async () => {
        const patient = await createTestPatient(context, {
            family: "WildcardCompartmentTest",
        });
        await createTestObservation(context, patient.id!, {
            code: "wildcard-compartment-test",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient/${patient.id}/*?_content=WildcardCompartmentTest`,
        });

        assertEquals(response.success, true);
        const bundle = response.jsonBody as Bundle;
        assertTrue(
            bundle.entry!.some((e) => e.resource?.resourceType === "Patient"),
        );
        assertTrue(
            bundle.entry!.some((e) =>
                e.resource?.resourceType === "Observation"
            ),
        );
    });

    it("Validate common parameters when _type is used", async () => {
        const patient = await createTestPatient(context, {
            family: "CommonParamTest",
        });
        await createTestObservation(context, patient.id!, {
            code: "common-param-test",
        });

        const validResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `?_type=Patient,Observation&_lastUpdated=gt2000-01-01`,
        });

        assertEquals(validResponse.success, true);

        const invalidResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `?_type=Patient,Observation&birthdate=gt2000-01-01`,
        });

        assertEquals(
            invalidResponse.success,
            false,
            "Server should reject search with parameters not common to all specified types",
        );
    });
}
