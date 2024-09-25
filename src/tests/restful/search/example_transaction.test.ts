// tests/example_transaction.test.ts

import { fetchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";
import { assertEquals, assertExists, assertTrue, it } from "../../../../deps.test.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";

export function runExampleTransactionTest(context: ITestContext) {

    it("Example Transaction - Complex scenario", async () => {
        const existingPatient = await createTestPatient(context, 'Complex Patient');
        assertTrue(existingPatient, "patient should be created");
        const existingPatientId = existingPatient.id;
        const nonTouchedPatient = await createTestPatient(context, 'Untouched Patient');
        const untouchedPatientId = nonTouchedPatient.id;
        const existingTag = `W/"${nonTouchedPatient.meta?.versionId}"`;
        const nowDate = Date.now();
        const transactionBundle: Bundle = {
            "resourceType" : "Bundle",
            "id" : "bundle-transaction",
            "meta" : {
              "lastUpdated" : "2014-08-18T01:43:30Z"
            },
            "type" : "transaction",
            "entry" : [
                {
              "fullUrl" : "urn:uuid:61ebe359-bfdc-4613-8bf2-c5e300945f0a",
              "resource" : {
                "resourceType" : "Patient",
                "text" : {
                  "status" : "generated",
                  "div" : "<div xmlns=\"http://www.w3.org/1999/xhtml\">Some narrative</div>"
                },
                "active" : true,
                "name" : [{
                  "use" : "official",
                  "family" : "Chalmers",
                  "given" : ["Peter",
                  "James"]
                }],
                "gender" : "male",
                "birthDate" : "1974-12-25"
              },
              "request" : {
                "method" : "POST",
                "url" : "Patient"
              }
            },
            {
              "fullUrl" : "urn:uuid:88f151c0-a954-468a-88bd-5ae15c08e059",
              "resource" : {
                "resourceType" : "Patient",
                "text" : {
                  "status" : "generated",
                  "div" : "<div xmlns=\"http://www.w3.org/1999/xhtml\">Some narrative</div>"
                },
                "identifier" : [{
                  "system" : "http:/example.org/fhir/ids",
                  "value" : "234234"
                }],
                "active" : true,
                "name" : [{
                  "use" : "official",
                  "family" : "Chalmers",
                  "given" : ["Peter",
                  "James"]
                }],
                "gender" : "male",
                "birthDate" : "1974-12-25"
              },
              "request" : {
                "method" : "POST",
                "url" : "Patient",
                "ifNoneExist" : `identifier=http:/example.org/fhir/ids|234234${nowDate}`
              }
            },
            {
              "fullUrl" : "http://example.org/fhir/Patient/123",
              "resource" : {
                "resourceType" : "Patient",
                "id" : `${existingPatientId}`,
                "text" : {
                  "status" : "generated",
                  "div" : "<div xmlns=\"http://www.w3.org/1999/xhtml\">Some narrative</div>"
                },
                "active" : true,
                "name" : [{
                  "use" : "official",
                  "family" : "Chalmers",
                  "given" : ["Peter",
                  "James"]
                }],
                "gender" : "male",
                "birthDate" : "1974-12-25"
              },
              "request" : {
                "method" : "PUT",
                "url" : `Patient/${existingPatientId}`
              }
            },
            {
              "fullUrl" : "urn:uuid:74891afc-ed52-42a2-bcd7-f13d9b60f096",
              "resource" : {
                "resourceType" : "Patient",
                "text" : {
                  "status" : "generated",
                  "div" : "<div xmlns=\"http://www.w3.org/1999/xhtml\">Some narrative</div>"
                },
                "identifier" : [{
                  "system" : "http:/example.org/fhir/ids",
                  "value" : `456456${nowDate}`
                }],
                "active" : true,
                "name" : [{
                  "use" : "official",
                  "family" : "Chalmers",
                  "given" : ["Peter",
                  "James"]
                }],
                "gender" : "male",
                "birthDate" : "1974-12-25"
              },
              "request" : {
                "method" : "PUT",
                "url" : `Patient?identifier=http:/example.org/fhir/ids|456456${nowDate}`
              }
            },
            {
              "fullUrl" : "http://example.org/fhir/Patient/123a",
              "resource" : {
                "resourceType" : "Patient",
                "id" : `${existingPatientId}`,
                "text" : {
                  "status" : "generated",
                  "div" : "<div xmlns=\"http://www.w3.org/1999/xhtml\">Some narrative</div>"
                },
                "active" : true,
                "name" : [{
                  "use" : "official",
                  "family" : "Chalmers",
                  "given" : ["Peter",
                  "James"]
                }],
                "gender" : "male",
                "birthDate" : "1974-12-25"
              },
              "request" : {
                "method" : "PUT",
                "url" : `Patient/${existingPatientId}`,
                "ifMatch" : "W/\"2\""
              }
            },
            {
              "request" : {
                "method" : "DELETE",
                "url" : `Patient/${existingPatientId}`
              }
            },
            {
              "request" : {
                "method" : "DELETE",
                "url" : "Patient?identifier=123456"
              }
            },
            {
              "fullUrl" : "urn:uuid:79378cb8-8f58-48e8-a5e8-60ac2755b674",
              "resource" : {
                "resourceType" : "Parameters",
                "parameter" : [{
                  "name" : "coding",
                  "valueCoding" : {
                    "system" : "http://loinc.org",
                    "code" : "1963-8"
                  }
                }]
              },
              "request" : {
                "method" : "POST",
                "url" : "http://hl7.org/fhir/ValueSet/$lookup"
              }
            },
            {
              "request" : {
                "method" : "GET",
                "url" : "Patient?name=peter"
              }
            },
            {
              "request" : {
                "method" : "GET",
                "url" : `Patient/${untouchedPatientId}`,
                "ifNoneMatch" : existingTag,
                "ifModifiedSince" : "2015-08-31T08:14:33+10:00"
              }
            }]
          };

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: "",
            method: "POST",
            body: JSON.stringify(transactionBundle),
        });

        assertEquals(response.success, true, "Transaction request should be successful");
        assertEquals(response.status, 200, "Should return 200 OK");
        const responseBundle = response.jsonBody as Bundle;

        // Verify the response bundle
        assertEquals(responseBundle.type, "transaction-response", "Response should be a transaction-response bundle");
        assertEquals(responseBundle.entry?.length, 10, "Response should have 10 entries");

        // Check specific entries
        const [entry1, entry2, entry3, entry4, entry5, entry6, entry7, entry8, entry9, entry10] = responseBundle.entry!;

        // Entry 1: Created Patient
        assertEquals(entry1.response?.status, "201 Created", "First entry should be created");
        assertExists(entry1.resource, "Created Patient resource should be included");
        assertEquals(entry1.resource?.resourceType, "Patient", "Created resource should be a Patient");
        assertExists(entry1.response?.location, "Location should be provided for created Patient");
        assertExists(entry1.response?.etag, "ETag should be provided for created Patient");
        assertExists(entry1.response?.lastModified, "Last-Modified should be provided for created Patient");
        //assertExists(entry1.response?.outcome, "OperationOutcome should be included for created Patient");
        //const outcome = entry1.response?.outcome as OperationOutcome;
        //assertEquals(outcome.issue?.[0].severity, "warning", "OperationOutcome should contain a warning");

        // Entry 2: Conditional create (not created)
        assertEquals(entry2.response?.status, "201 Created", "Second entry should be 201 Created");

        // Entry 3: Update
        assertEquals(entry3.response?.status, "200 ok", "Third entry should be updated");
        assertExists(entry3.response?.location, "Location should be provided for updated Patient");
        assertExists(entry3.response?.etag, "ETag should be provided for updated Patient");

        // Entry 4: Conditional update (created)
        assertEquals(entry4.response?.status, "201 Created", "Fourth entry should be created");
        assertExists(entry4.response?.location, "Location should be provided for conditionally created Patient");
        assertExists(entry4.response?.etag, "ETag should be provided for conditionally created Patient");

        // Entry 5: Version-aware update
        assertEquals(entry5.response?.status, "200 ok", "Fifth entry should be updated");
        assertExists(entry5.response?.location, "Location should be provided for version-aware updated Patient");
        assertExists(entry5.response?.etag, "ETag should be provided for version-aware updated Patient");

        // Entry 6: Delete
        assertEquals(entry6.response?.status, "204 No Content", "Sixth entry (delete) should be accepted");

        // Entry 7: Conditional delete
        assertEquals(entry7.response?.status, "204 No Content", "Seventh entry (conditional delete) should be deleted");

        // Entry 8: Operation
        assertEquals(entry8.response?.status, "201 Created", "Eighth entry (operation) should be successful");
        assertExists(entry8.resource, "Operation result should be included");
        assertEquals(entry8.resource?.resourceType, "Parameters", "Operation result should be Parameters");

        // Entry 9: Search
        assertEquals(entry9.response?.status, "200 ok", "Ninth entry (search) should be successful");
        assertExists(entry9.resource, "Search result should be included");
        assertEquals(entry9.resource?.resourceType, "Bundle", "Search result should be a Bundle");
        assertEquals((entry9.resource as Bundle).type, "searchset", "Search result should be a searchset");

        // Entry 10: Conditional read
        assertEquals(entry10.response?.status, "304 Not Modified", "Tenth entry (conditional read) should be not modified");
    });
}

async function createTestPatient(_context: ITestContext, family: string): Promise<Patient> {
    const newPatient: Patient = {
        resourceType: "Patient",
        name: [{ family: family }],
        active: false,
        telecom: [{}]
    };

    const response = await fetchWrapper({
        authorized: true,
        relativeUrl: "Patient",
        method: "POST",
        body: JSON.stringify(newPatient),
    });

    return response.jsonBody as Patient;
}
