// tests/search/parameters/summary.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

export function runSummaryTests(context: ITestContext) {
    if (context.isSummarySearchParameterSupported()) {
        it("Should return a limited subset of elements when _summary=true", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_summary=true`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(returnedPatient.id, "Summary should include id");
            assertExists(returnedPatient.meta, "Summary should include meta");
            assertExists(returnedPatient.name, "Summary should include name");
            assertEquals(
                returnedPatient.gender,
                undefined,
                "Summary should not include gender",
            );
            assertEquals(
                returnedPatient.birthDate,
                undefined,
                "Summary should not include birthDate",
            );
        });

        it("Should return only text, id, meta, and top-level mandatory elements when _summary=text", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_summary=text`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(returnedPatient.id, "Text summary should include id");
            assertExists(
                returnedPatient.meta,
                "Text summary should include meta",
            );
            assertExists(
                returnedPatient.text,
                "Text summary should include text",
            );
            assertEquals(
                returnedPatient.name,
                undefined,
                "Text summary should not include name",
            );
            assertEquals(
                returnedPatient.gender,
                undefined,
                "Text summary should not include gender",
            );
            assertEquals(
                returnedPatient.birthDate,
                undefined,
                "Text summary should not include birthDate",
            );
        });

        it("Should remove the text element when _summary=data", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_summary=data`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(returnedPatient.id, "Data summary should include id");
            assertExists(
                returnedPatient.meta,
                "Data summary should include meta",
            );
            assertEquals(
                returnedPatient.text,
                undefined,
                "Data summary should not include text",
            );
            assertExists(
                returnedPatient.name,
                "Data summary should include name",
            );
            assertExists(
                returnedPatient.gender,
                "Data summary should include gender",
            );
            assertExists(
                returnedPatient.birthDate,
                "Data summary should include birthDate",
            );
        });

        it("Should return only a count when _summary=count", async () => {
            const patientCount = 5;
            for (let i = 0; i < patientCount; i++) {
                await createTestPatient(context, {
                    name: [{ given: [`TestPatient${i}`] }],
                });
            }

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_summary=count`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertEquals(
                bundle.total,
                patientCount,
                "Count summary should return the correct total",
            );
            assertEquals(
                bundle.entry,
                undefined,
                "Count summary should not include entries",
            );
        });

        it("Should return all parts of the resource when _summary=false", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_summary=false`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(returnedPatient.id, "Full resource should include id");
            assertExists(
                returnedPatient.meta,
                "Full resource should include meta",
            );
            assertExists(
                returnedPatient.text,
                "Full resource should include text",
            );
            assertExists(
                returnedPatient.name,
                "Full resource should include name",
            );
            assertExists(
                returnedPatient.gender,
                "Full resource should include gender",
            );
            assertExists(
                returnedPatient.birthDate,
                "Full resource should include birthDate",
            );
        });

        it("Should not allow _include with _summary=text", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });
            await createTestObservation(context, patient.id!, {
                code: "test-code",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation?subject=${patient.id}&_include=Observation:subject&_summary=text`,
            });

            assertEquals(
                response.status,
                400,
                "Server should reject _include with _summary=text",
            );
        });

        it("Should mark summarized resources with SUBSETTED tag", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"], family: "TestFamily" }],
                gender: "male",
                birthDate: "1990-01-01",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}?_summary=true`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process the request successfully",
            );
            const returnedPatient = response.jsonBody as Patient;
            assertExists(
                returnedPatient.meta?.tag,
                "Summarized resource should have tags",
            );
            assertTrue(
                returnedPatient.meta!.tag!.some((tag) =>
                    tag.code === "SUBSETTED"
                ),
                "Summarized resource should be marked with SUBSETTED tag",
            );
        });
    }
}
