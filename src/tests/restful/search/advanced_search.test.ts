// tests/advanced_search.test.ts

import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    Bundle,
    Medication,
    MedicationRequest,
    Observation,
    Patient
} from "npm:@types/fhir/r4.d.ts";
import {
    createTestMedicationRequest,
    createTestObservation,
    createTestPatient,
    uniqueCharacters,
    uniqueString,
} from "../../utils/resource_creators.ts";
import { assertNotExists } from "../../utils/asserts/assert_not_exists.ts";

export function runAdvancedSearchTests(context: ITestContext) {

    it("Search - Chained parameters", async () => {
        const uniqueName = uniqueCharacters(5);
        await createTestPatient(context, {
            name: [{ given: [uniqueName], family: "Doe" }],
        });
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:Patient.name=${uniqueName}`,
        });

        assertEquals(
            response.success,
            true,
            "Chained parameter search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertEquals(
            bundle.entry?.every((e) =>
                e.resource?.resourceType === "Observation"
            ),
            true,
            "All entries should be Observation resources",
        );
    });

    it("Search - Reverse chained parameters using _revinclude", async () => {
        const uniqueName = uniqueCharacters(5);
        // Create test patients
        const patient1 = await createTestPatient(context, {
            family: "ReverseChain",
            given: [`${uniqueName}Test`],
        });

        const patient2 = await createTestPatient(context, {
            family: "ReverseChain",
            given: [`${uniqueName}Test2`],
        });

        // Create observation linked to patient1 with specific code
        const matchingObservation = await createTestObservation(
            context,
            patient1.id!,
            {
                code: "55284-4",
                system: "http://loinc.org",
                status: "final",
            },
        );

        // Create different observation for patient2
        const nonMatchingObservation = await createTestObservation(
            context,
            patient2.id!,
            {
                code: "8867-4", // Different LOINC code
                system: "http://loinc.org",
                status: "final",
            },
        );

        // Search patients and include referring observations
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Patient?name:contains=${uniqueName}Test&_revinclude=Observation:subject`,
        });

        assertEquals(
            response.success,
            true,
            "Reverse include search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Verify patient resources
        const patientEntries = bundle.entry.filter((e) =>
            e.resource?.resourceType === "Patient" &&
            e.search?.mode === "match"
        );
        assertTrue(patientEntries.length > 0, "Should find patients");
        assertTrue(
            patientEntries.some((e) => e.resource?.id === patient1.id),
            "Should find first patient",
        );
        assertTrue(
            patientEntries.some((e) => e.resource?.id === patient2.id),
            "Should find second patient",
        );

        // Verify included observations
        const observationEntries = bundle.entry.filter((e) =>
            e.resource?.resourceType === "Observation" &&
            e.search?.mode === "include"
        );
        assertTrue(
            observationEntries.length > 0,
            "Should include observations",
        );
        assertTrue(
            observationEntries.some((e) =>
                e.resource?.id === matchingObservation.id
            ),
            "Should include matching observation",
        );
        assertTrue(
            observationEntries.some((e) =>
                e.resource?.id === nonMatchingObservation.id
            ),
            "Should include non-matching observation",
        );

        // Verify relationships
        const observations = observationEntries.map((e) =>
            e.resource as Observation
        );
        observations.forEach((obs) => {
            assertExists(obs.subject, "Each observation should have a subject");
            assertTrue(
                obs.subject.reference?.includes(patient1.id!) ||
                    obs.subject.reference?.includes(patient2.id!),
                "Observations should reference test patients",
            );
        });

        // Verify search modes
        bundle.entry?.forEach((entry) => {
            if (entry.resource?.resourceType === "Patient") {
                assertEquals(
                    entry.search?.mode,
                    "match",
                    "Patients should be marked as matches",
                );
            } else if (entry.resource?.resourceType === "Observation") {
                assertEquals(
                    entry.search?.mode,
                    "include",
                    "Observations should be marked as includes",
                );
            }
        });
    });

    it("Search - Composite parameters", async () => {
        const patient = await createTestPatient(context);

        const observation = await createTestObservation(context, patient.id!, {
            code: "8480-6",
            system: "http://loinc.org",
            value: 120,
            unit: "mmHg",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                "Observation?component-code-value-quantity=http://loinc.org|8480-6$gt100",
        });

        assertEquals(
            response.success,
            true,
            "Composite parameter search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const observations = bundle.entry.map((e) => e.resource as Observation);
        assertTrue(
            observations.some((o) => o.id === observation.id),
            "Should find observation with matching criteria",
        );
        assertTrue(
            observations.every((o) => o.resourceType === "Observation"),
            "All entries should be Observation resources",
        );
    });

    it("Search - Token search on system", async () => {
        const patient = await createTestPatient(context, {
            identifier: [{
                system: "http://example.org/fhir/ids",
                value: "test-id",
            }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?identifier=http://example.org/fhir/ids|",
        });

        assertEquals(
            response.success,
            true,
            "Token search on system should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const patients = bundle.entry.map((e) => e.resource as Patient);
        assertTrue(
            patients.some((p) => p.id === patient.id),
            "Should find patient with matching identifier system",
        );
        assertTrue(
            patients.every((p) => p.resourceType === "Patient"),
            "All entries should be Patient resources",
        );
    });

    it("Search - Date range", async () => {
        const patient = await createTestPatient(context, {
            birthDate: "2005-06-15",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                "Patient?birthdate=ge2000-01-01&birthdate=le2010-12-31",
        });

        assertEquals(
            response.success,
            true,
            "Date range search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const patients = bundle.entry.map((e) => e.resource as Patient);
        assertTrue(
            patients.some((p) => p.id === patient.id),
            "Should find patient with birthdate in range",
        );
        assertTrue(
            patients.every((p) => p.resourceType === "Patient"),
            "All entries should be Patient resources",
        );
    });

    it("Search - _include parameter", async () => {
        const patient = await createTestPatient(context);

        const medicationRequest = await createTestMedicationRequest(
            context,
            patient.id!,
            {
                subject: { reference: `Patient/${patient.id}` },
            },
        );

        //await sleep(500);
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `MedicationRequest?_id=${medicationRequest.id}&_include=MedicationRequest:subject`,
        });

        assertEquals(
            response.success,
            true,
            "_include search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Verify MedicationRequest is included
        const medRequest = bundle.entry.find((e) =>
            e.resource?.resourceType === "MedicationRequest" &&
            e.resource.id === medicationRequest.id
        );
        assertExists(medRequest, "Should include original MedicationRequest");

        // Verify referenced Patient is included
        const includedPatient = bundle.entry.find((e) =>
            e.resource?.resourceType === "Patient" &&
            e.resource.id === patient.id
        );
        assertExists(includedPatient, "Should include referenced Patient");
        assertEquals(
            includedPatient.search?.mode,
            "include",
            "Patient should be marked as included",
        );
    });

    it("Search - _revinclude parameter", async () => {
        const patient = await createTestPatient(context);

        const observation = await createTestObservation(context, patient.id!, {
            subject: { reference: `Patient/${patient.id}` },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_revinclude=Observation:subject",
        });

        assertEquals(
            response.success,
            true,
            "_revinclude search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        // Verify Patient is included
        const patientEntry = bundle.entry.find((e) =>
            e.resource?.resourceType === "Patient" &&
            e.resource.id === patient.id
        );
        assertExists(patientEntry, "Should include matched Patient");
        assertEquals(
            patientEntry.search?.mode,
            "match",
            "Patient should be marked as match",
        );

        // Verify referring Observation is included
        const obsEntry = bundle.entry.find((e) =>
            e.resource?.resourceType === "Observation" &&
            e.resource.id === observation.id
        );
        assertExists(obsEntry, "Should include referring Observation");
        assertEquals(
            obsEntry.search?.mode,
            "include",
            "Observation should be marked as included",
        );
    });

    it("Search - _summary parameter", async () => {
        const patient = await createTestPatient(context, {
            family: "Test",
            given: ["Summary"],
            birthDate: "1990-01-01",
            gender: "male",
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_summary=true",
        });

        assertEquals(
            response.success,
            true,
            "_summary search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const returnedPatient = bundle.entry.find((e) =>
            e.resource?.resourceType === "Patient" &&
            e.resource.id === patient.id
        )?.resource as Patient;

        assertExists(returnedPatient, "Should find the test patient");
        assertExists(returnedPatient.id, "Summary should include id");
        assertExists(returnedPatient.meta, "Summary should include meta");
        assertTrue(
            Object.keys(returnedPatient).length < 10,
            "Summary should include limited fields",
        );
    });

    it("Search - _elements parameter", async () => {
        const patient = await createTestPatient(context, {
            family: "Test",
            given: ["Elements"],
            birthDate: "1990-01-01",
            gender: "male",
            communication: [{
                language: {
                    coding: [{ system: "urn:ietf:bcp:47", code: "en" }],
                },
            }],
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_elements=id,name",
        });

        assertEquals(
            response.success,
            true,
            "_elements search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const returnedPatient = bundle.entry.find((e) =>
            e.resource?.resourceType === "Patient" &&
            e.resource.id === patient.id
        )?.resource as Patient;

        assertExists(returnedPatient, "Should find the test patient");
        assertExists(returnedPatient.id, "Should include id");
        assertExists(returnedPatient.name, "Should include name");
        assertNotExists(
            returnedPatient.communication,
            "Should not include communication",
        );
    });

    it("Search - _count parameter", async () => {
        // Create multiple test patients
        const patients = [];
        for (let i = 0; i < 10; i++) {
            patients.push(
                await createTestPatient(context, {
                    family: `Test${i}`,
                    given: ["Count"],
                }),
            );
        }

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_count=5",
        });

        assertEquals(
            response.success,
            true,
            "_count search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length <= 5,
            "Should return no more than 5 entries",
        );

        // Verify pagination links exist
        assertExists(
            bundle.link?.find((l) => l.relation === "next"),
            "Should include next page link",
        );
        if (context.isPaginationFirstRelationLinkSupported()) {
            assertExists(
                bundle.link?.find((l) => l.relation === "first"),
                "Should include first page link",
            );
        }
    });

    it("Search - _sort parameter with birthdates", async () => {
        // Create test patients with different birth dates
        const patient1 = await createTestPatient(context, {
            family: "SortTest",
            given: ["Alpha"],
            birthDate: "1990-01-01", // Oldest
        });

        const patient2 = await createTestPatient(context, {
            family: "SortTest",
            given: ["Beta"],
            birthDate: "2000-01-01", // Middle
        });

        const patient3 = await createTestPatient(context, {
            family: "SortTest",
            given: ["Gamma"],
            birthDate: "2010-01-01", // Youngest
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_sort=birthdate&family=SortTest",
        });

        assertEquals(
            response.success,
            true,
            "_sort search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");

        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");

        const patients = bundle.entry.map((e) => e.resource as Patient);
        assertTrue(
            patients.length >= 3,
            "Should return at least our 3 test patients",
        );

        // Verify patients are returned in ascending birthdate order
        const testPatients = patients.filter((p) =>
            p.name?.[0]?.family === "SortTest"
        );
        assertEquals(testPatients.length, 3, "Should find all 3 test patients");

        // Verify order explicitly
        assertEquals(
            testPatients[0].id,
            patient1.id,
            "First patient should be oldest (1990)",
        );
        assertEquals(
            testPatients[1].id,
            patient2.id,
            "Second patient should be middle (2000)",
        );
        assertEquals(
            testPatients[2].id,
            patient3.id,
            "Third patient should be youngest (2010)",
        );

        // Verify dates are in correct order
        for (let i = 1; i < testPatients.length; i++) {
            const prevDate = new Date(testPatients[i - 1].birthDate!);
            const currDate = new Date(testPatients[i].birthDate!);
            assertTrue(
                prevDate <= currDate,
                `Patient ${testPatients[i - 1].id} (${
                    testPatients[i - 1].birthDate
                }) should be before or equal to ${testPatients[i].id} (${
                    testPatients[i].birthDate
                })`,
            );
        }

        // Also test descending sort
        const descendingResponse = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?_sort=-birthdate&family=SortTest",
        });

        assertEquals(
            descendingResponse.status,
            200,
            "Descending sort should be successful",
        );
        const descendingBundle = descendingResponse.jsonBody as Bundle;
        const descendingPatients = descendingBundle.entry!
            .map((e) => e.resource as Patient)
            .filter((p) => p.name?.[0]?.family === "SortTest");

        // Verify reverse order
        assertEquals(
            descendingPatients[0].id,
            patient3.id,
            "First patient should be youngest (2010)",
        );
        assertEquals(
            descendingPatients[1].id,
            patient2.id,
            "Second patient should be middle (2000)",
        );
        assertEquals(
            descendingPatients[2].id,
            patient1.id,
            "Third patient should be oldest (1990)",
        );
    });

    it("Search - _total parameter", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "Patient?_total=accurate",
        });

        assertEquals(
            response.success,
            true,
            "_total search should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.total, "Should include total count");
        assertEquals(typeof bundle.total, "number", "Total should be a number");
    });

    if (context.isContainedSearchesSupported()) {
        it("Should handle _containedType parameter variations", async () => {
            // Create test data
            const patient = await createTestPatient(context);
            const code = uniqueString("test-code");

            // Create MedicationRequest with contained Medication
            const medicationRequest = await createTestMedicationRequest(
                context,
                patient.id!,
                {
                    containedMedication: {
                        resourceType: "Medication",
                        id: "med1",
                        ingredient: [{
                            itemCodeableConcept: {
                                coding: [{
                                    system: "http://example.org/medications",
                                    code: code,
                                }],
                            },
                        }],
                    },
                },
            );

            // Test contained=true with containedType=contained
            // This should return just the contained Medication
            const containedResponse = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Medication?ingredient-code=${code}&_contained=true&_containedType=contained`,
            });

            assertEquals(
                containedResponse.status,
                200,
                "Server should process contained request successfully",
            );
            const containedBundle = containedResponse.jsonBody as Bundle;
            assertExists(
                containedBundle.entry,
                "Bundle should contain entries",
            );
            assertEquals(
                containedBundle.entry.length,
                1,
                "Bundle should contain 1 entry",
            );

            const containedMedication = containedBundle.entry[0]
                .resource as Medication;
            assertEquals(
                containedMedication.resourceType,
                "Medication",
                "Should return the contained Medication",
            );
            assertEquals(
                containedMedication.id,
                "med1",
                "Should return the correct contained Medication",
            );
            assertTrue(
                containedBundle.entry[0].fullUrl?.includes("#med1"),
                "fullUrl should include the contained resource id",
            );
            assertEquals(
                containedBundle.entry[0].search?.mode,
                "match",
                "search mode should be 'match'",
            );

            // Test contained=true with containedType=container
            // This should return the MedicationRequest that contains the matching Medication
            const containerResponse = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Medication?ingredient-code=${code}&_contained=true&_containedType=container`,
            });

            assertEquals(
                containerResponse.status,
                200,
                "Server should process container request successfully",
            );
            const containerBundle = containerResponse.jsonBody as Bundle;
            assertExists(
                containerBundle.entry,
                "Bundle should contain entries",
            );
            assertEquals(
                containerBundle.entry.length,
                1,
                "Bundle should contain 1 entry",
            );

            const containerMedicationRequest = containerBundle.entry[0]
                .resource as MedicationRequest;
            assertEquals(
                containerMedicationRequest.id,
                medicationRequest.id,
                "Should return the container MedicationRequest",
            );
            assertExists(
                containerMedicationRequest.contained,
                "Container should include contained resources",
            );
            assertEquals(
                containerMedicationRequest.contained[0].resourceType,
                "Medication",
                "Contained resource should be a Medication",
            );
            assertEquals(
                containerMedicationRequest.contained[0].id,
                "med1",
                "Should contain the correct Medication",
            );

            // Test with default _containedType (should be container)
            const defaultResponse = await fetchWrapper({
                authorized: true,
                relativeUrl:
                    `Medication?ingredient-code=${code}&_contained=true`,
            });

            assertEquals(
                defaultResponse.status,
                200,
                "Server should process default request successfully",
            );
            const defaultBundle = defaultResponse.jsonBody as Bundle;
            assertExists(defaultBundle.entry, "Bundle should contain entries");
            assertEquals(
                defaultBundle.entry.length,
                1,
                "Bundle should contain 1 entry",
            );

            const defaultMedicationRequest = defaultBundle.entry[0]
                .resource as MedicationRequest;
            assertEquals(
                defaultMedicationRequest.id,
                medicationRequest.id,
                "Should return the container MedicationRequest by default",
            );
            assertExists(
                defaultMedicationRequest.contained,
                "Default response should include contained resources",
            );
            assertEquals(
                defaultMedicationRequest.contained[0].id,
                "med1",
                "Should contain the correct Medication",
            );
        });
    }
}
