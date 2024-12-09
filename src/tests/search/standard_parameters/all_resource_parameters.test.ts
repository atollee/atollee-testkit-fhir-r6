// tests/search/parameters/all_resource_parameters.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import {
    createTestAllergyIntolerance,
    createTestGroup,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import {
    AllergyIntolerance,
    Bundle,
    Observation,
    Patient,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";
import { Context } from "https://deno.land/x/oak@14.2.0/mod.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAllResourceParametersTests(context: ITestContext) {
    if (context.isFullTextSearchSupported()) {
        it("Should support _content parameter", async () => {
            const uniqueContent = uniqueString("TestContent");
            await createTestPatient(context, {
                name: [{ text: uniqueContent }],
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_content=${uniqueContent}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _content parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });
    }

    it("Should support _filter parameter", async () => {
        const uniqueName = uniqueString("TestName");
        await createTestPatient(context, { name: [{ given: [uniqueName] }] });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_filter=name eq "${uniqueName}"`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _filter parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _has parameter", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: "test-code",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_has:Observation:patient:code=test-code`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _has parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should support _id parameter", async () => {
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_id=${patient.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _id parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            1,
            "Bundle should contain exactly one entry",
        );
    });

    it("Should support _in parameter with Group resource", async () => {
        // First, create some test patients
        const patient1 = await createTestPatient(context, {});
        const patient2 = await createTestPatient(context, {});

        // Then, create a Group containing these patients
        const group = await createTestGroup(context, {
            type: "person",
            actual: true,
            member: [
                { entity: { reference: `Patient/${patient1.id}` } },
                { entity: { reference: `Patient/${patient2.id}` } },
            ],
        });

        // Now, search for patients in this group using the _in parameter
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_in=Group/${group.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _in parameter with Group successfully",
        );

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain exactly two Patients",
        );

        // Verify that the returned patients are the ones we added to the group
        const returnedIds = bundle.entry.map((entry) =>
            (entry.resource as Patient).id
        );
        assertTrue(
            returnedIds.includes(patient1.id),
            "Results should include the first patient",
        );
        assertTrue(
            returnedIds.includes(patient2.id),
            "Results should include the second patient",
        );
    });

    if (context.isLanguageSearchParameterSupported()) {
        it("Should support _language parameter", async () => {
            // Since language is not directly supported in createTestPatient,
            // we'll create a patient and then update it with the language
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });

            const updatedPatient = {
                ...patient,
                language: "en",
            };

            await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}`,
                method: "PUT",
                body: JSON.stringify(updatedPatient),
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_language=en`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _language parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });
    }

    it("Should support _lastUpdated parameter", async () => {
        const dateString = new Date().toISOString();
        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_lastUpdated=gt${dateString}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _lastUpdated parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
    });

    if (context.isNamedListSearchParameterSupported()) {
        it("Should support _list parameter with standard functional list", async () => {
            // First, create a test patient
            const patient = await createTestPatient(context, {});

            // Then, create a test AllergyIntolerance for this patient
            await createTestAllergyIntolerance(context, patient.id!, {
                clinicalStatus: {
                    coding: [{
                        system:
                            "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                        code: "active",
                    }],
                },
            });

            // Now, search for the patient's current allergies using the standard functional list
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `AllergyIntolerance?patient=${patient.id}&_list=$current-allergies`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _list parameter with $current-allergies successfully",
            );

            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one AllergyIntolerance",
            );

            // Verify that all returned resources are AllergyIntolerance and are for the correct patient
            bundle.entry.forEach((entry) => {
                assertEquals(
                    entry.resource?.resourceType,
                    "AllergyIntolerance",
                    "All resources should be AllergyIntolerance",
                );
                assertEquals(
                    (entry.resource as AllergyIntolerance).patient?.reference,
                    `Patient/${patient.id}`,
                    "All AllergyIntolerance resources should be for the correct patient",
                );
            });
        });
    }

    it("Should support _profile parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the profile
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                profile: [
                    "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
                ],
            },
        };

        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_profile=http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _profile parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    if (context.isQuerySearchParameterSupported()) {
        it("Should support $lastn named query for Observations", async () => {
            // First, create a test patient
            const patient = await createTestPatient(context, {});

            // Create multiple test observations for this patient
            for (let i = 0; i < 5; i++) {
                await createTestObservation(context, patient.id!, {
                    subject: { reference: `Patient/${patient.id}` },
                    code: "8867-4",
                    system: "http://loinc.org",
                    valueQuantity: {
                        value: 60 + i, // Increasing heart rate values
                        unit: "beats/minute",
                        system: "http://unitsofmeasure.org",
                        code: "/min",
                    },
                    effectiveDateTime: new Date(
                        Date.now() - i * 24 * 60 * 60 * 1000,
                    ).toISOString(), // Dates going back in time
                });
            }

            // Now use the $lastn operation to get the last 3 heart rate observations
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl:
                    `Observation/$lastn?patient=${patient.id}&code=http://loinc.org|8867-4&_count=3`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process $lastn named query successfully",
            );

            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(
                bundle.entry.length,
                3,
                "Bundle should contain exactly 3 entries",
            );

            // Verify that the observations are the most recent and in the correct order
            const observations = bundle.entry.map((entry) =>
                entry.resource as Observation
            );
            for (let i = 0; i < observations.length - 1; i++) {
                assertTrue(
                    observations[i].effectiveDateTime! >
                        observations[i + 1].effectiveDateTime!,
                    "Observations should be in descending order of date",
                );
            }

            // Verify that all observations are for the correct patient and have the correct code
            observations.forEach((obs) => {
                assertEquals(
                    obs.subject?.reference,
                    `Patient/${patient.id}`,
                    "Observation should be for the correct patient",
                );
                assertEquals(
                    obs.code.coding?.[0].code,
                    "8867-4",
                    "Observation should have the correct LOINC code",
                );
            });
        });
    }

    it("Should support _security parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the security tag
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                security: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/v3-Confidentiality",
                    code: "R",
                }],
            },
        };

        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?_security=http://terminology.hl7.org/CodeSystem/v3-Confidentiality|R`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    if (context.isSourceSearchParameterSupported()) {
        it("Should support _source parameter", async () => {
            // Since meta is not directly supported in createTestPatient,
            // we'll create a patient and then update it with the source
            const patient = await createTestPatient(context, {
                name: [{ given: [uniqueString("TestPatient")] }],
            });

            const source = uniqueString("http://example.com/source");
            const updatedPatient = {
                ...patient,
                meta: { source },
            };

            await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient/${patient.id}`,
                method: "PUT",
                body: JSON.stringify(updatedPatient),
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_source=${source}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _source parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });
    }

    it("Should support _tag parameter", async () => {
        // Since meta is not directly supported in createTestPatient,
        // we'll create a patient and then update it with the tag
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });

        const updatedPatient = {
            ...patient,
            meta: {
                tag: [{ system: "http://example.com/tags", code: "test-tag" }],
            },
        };

        await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(updatedPatient),
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Patient?_tag=http://example.com/tags|test-tag`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _tag parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    if (context.isFullTextSearchSupported()) {
        it("Should support _text parameter", async () => {
            const uniqueText = uniqueString("TestText");
            await createTestPatient(context, { name: [{ text: uniqueText }] });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Patient?_text=${uniqueText}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _text parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });
    }

    if (context.isMultiTypeSearchSupported()) {
        it("Should support _type parameter", async () => {
            const patient = await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
            });
            await createTestObservation(context, patient.id!, {
                code: "test-code",
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `?_type=Patient,Observation`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _type parameter successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
            assertTrue(
                bundle.entry.some((entry) =>
                    entry.resource?.resourceType === "Patient"
                ) &&
                    bundle.entry.some((entry) =>
                        entry.resource?.resourceType === "Observation"
                    ),
                "Bundle should contain both Patient and Observation resources",
            );
        });
    }
}
