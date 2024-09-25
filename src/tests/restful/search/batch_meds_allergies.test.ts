import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import {
    AllergyIntolerance,
    Bundle,
    Condition,
    MedicationStatement,
    Patient,
    Resource,
} from "npm:@types/fhir/r4.d.ts";

async function createTestPatient(
    _context: ITestContext,
    family: string,
): Promise<Patient> {
    const newPatient: Patient = {
        resourceType: "Patient",
        name: [{ family: family }],
        active: true,
        telecom: [{}],
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Patient",
        method: "POST",
        body: JSON.stringify(newPatient),
    });

    return response.jsonBody as Patient;
}

async function createTestResource(
    _context: ITestContext,
    resource: Resource,
): Promise<Resource> {
    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: resource.resourceType,
        method: "POST",
        body: JSON.stringify(resource),
    });

    assertTrue(response.success, "Should return 200 OK");
    return response.jsonBody as Resource;
}

export function runBatchMedsAllergiesTest(context: ITestContext) {
    it("Batch - Medications and Allergies", async () => {
        // Create test patient
        const patient = await createTestPatient(context, "Test Patient");
        const patientId = patient.id;

        if (!patientId) {
            throw new Error("Failed to create test patient");
        }

        // Create test MedicationStatement
        const medicationStatement: MedicationStatement = {
            resourceType: "MedicationStatement",
            status: "active",
            subject: { reference: `Patient/${patientId}` },
            medicationCodeableConcept: {
                coding: [{
                    system: "http://www.nlm.nih.gov/research/umls/rxnorm",
                    code: "1049502",
                }],
            },
        };
        const createdMedicationStatement = await createTestResource(
            context,
            medicationStatement,
        );
        assertEquals(
            createdMedicationStatement.resourceType,
            "MedicationStatement",
            "medication statement was created",
        );

        // Create test AllergyIntolerance
        const allergyIntolerance: AllergyIntolerance = {
            resourceType: "AllergyIntolerance",
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    code: "active",
                }],
            },
            patient: { reference: `Patient/${patientId}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct22",
                    code: "39579001",
                }],
            },
        };
        const createdAllergyIntolerance = await createTestResource(
            context,
            allergyIntolerance,
        );
        assertEquals(
            createdAllergyIntolerance.resourceType,
            "AllergyIntolerance",
            "allergy intolerance was created",
        );

        // Create test Condition
        const condition: Condition = {
            resourceType: "Condition",
            subject: { reference: `Patient/${patientId}` },
            code: {
                coding: [{
                    system: "http://snomed.info/sct22",
                    code: "38341003",
                }],
            },
            clinicalStatus: {
                coding: [{
                    system:
                        "http://terminology.hl7.org/CodeSystem/condition-clinical",
                    code: "active",
                }],
            },
        };
        const createdCondition = await createTestResource(context, condition);
        assertEquals(
            createdCondition.resourceType,
            "Condition",
            "condition was created",
        );

        const batchRequest: Bundle = {
            resourceType: "Bundle",
            id: "bundle-request-medsallergies",
            type: "batch",
            entry: [
                {
                    request: {
                        method: "GET",
                        url: `Patient/${patientId}`,
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: `MedicationStatement?patient=Patient/${patientId}`,
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: `AllergyIntolerance?patient=Patient/${patientId}`,
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: `Condition?patient=Patient/${patientId}`,
                    },
                },
                {
                    request: {
                        method: "GET",
                        url: `MedicationStatement?patient=Patient/${patientId}&status=active`,
                    },
                },
            ],
        };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(batchRequest),
        });

        assertEquals(
            response.success,
            true,
            "Batch request should be successful",
        );
        assertEquals(response.status, 200, "Should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;

        // Verify the response bundle
        assertEquals(
            responseBundle.type,
            "batch-response",
            "Response should be a batch-response bundle",
        );
        assertEquals(
            responseBundle.entry?.length,
            5,
            "Response should have 5 entries",
        );

        // Check each entry
        responseBundle.entry?.forEach((entry, index) => {
            assertExists(
                entry.response,
                `Entry ${index} should have a response`,
            );
            assertEquals(
                entry.response?.status,
                "200 ok",
                `Entry ${index} should have a 200 status`,
            );
            if (entry.resource?.resourceType !== "Bundle") {
                assertExists(
                    entry.response?.etag,
                    `Entry ${index} should have an etag`,
                );
                assertExists(
                    entry.response?.lastModified,
                    `Entry ${index} should have a lastModified date`,
                );
                assertExists(
                    entry.resource,
                    `Entry ${index} should have a resource`,
                );
            }
        });

        // Check Patient resource
        const patientResource = responseBundle.entry?.[0].resource as Patient;
        assertEquals(
            patientResource.resourceType,
            "Patient",
            "First entry should be a Patient resource",
        );
        assertEquals(
            patientResource.id,
            patientId,
            `Patient should have id '${patientId}'`,
        );

        // Check search result bundles
        for (let i = 1; i < 5; i++) {
            const searchBundle = responseBundle.entry?.[i].resource as Bundle;
            assertEquals(
                searchBundle.resourceType,
                "Bundle",
                `Entry ${i} should be a Bundle`,
            );
            assertEquals(
                searchBundle.type,
                "searchset",
                `Entry ${i} should be a searchset`,
            );
            assertExists(searchBundle.total, `Entry ${i} should have a total`);
            assertExists(searchBundle.link, `Entry ${i} should have a link`);
            assertEquals(
                searchBundle.link?.[0].relation,
                "self",
                `Entry ${i} should have a self link`,
            );
        }

        // Additional checks for the content of each search result
        assertEquals(
            (responseBundle.entry?.[1].resource as Bundle).total,
            1,
            "Should have 1 MedicationStatement",
        );
        assertEquals(
            (responseBundle.entry?.[2].resource as Bundle).total,
            1,
            "Should have 1 AllergyIntolerance",
        );
        assertEquals(
            (responseBundle.entry?.[3].resource as Bundle).total,
            1,
            "Should have 1 Condition",
        );
        assertEquals(
            (responseBundle.entry?.[4].resource as Bundle).total,
            1,
            "Should have 1 active MedicationStatement",
        );
    });
}
