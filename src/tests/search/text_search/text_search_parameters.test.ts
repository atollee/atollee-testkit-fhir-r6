// tests/search/parameters/text_search_parameters.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestCondition,
    createTestObservation,
    createTestPatient,
} from "../../utils/resource_creators.ts";
import { Bundle, Condition, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runTextSearchParameterTests(context: ITestContext) {
    it("Should search using _text parameter with single word", async () => {
        const uniqueWord = uniqueString("metastases");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient has ${uniqueWord}</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?_text=${uniqueWord}`,
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
        assertTrue(
            (bundle.entry[0].resource as Condition).text?.div?.includes(
                uniqueWord,
            ),
            "Returned Condition should contain the search word in narrative",
        );
    });

    it("Should search using _text parameter with multiple words and AND logic", async () => {
        const uniqueWord1 = uniqueString("bone");
        const uniqueWord2 = uniqueString("metastases");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient has ${uniqueWord1} ${uniqueWord2}</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?_text=${uniqueWord1} AND ${uniqueWord2}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text parameter with AND logic successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        const conditionText = (bundle.entry[0].resource as Condition).text
            ?.div;
        assertTrue(
            conditionText?.includes(uniqueWord1) &&
                conditionText?.includes(uniqueWord2),
            "Returned Condition should contain both search words in narrative",
        );
    });

    it("Should search using _text parameter with multiple words and OR logic", async () => {
        const uniqueWord1 = uniqueString("liver");
        const uniqueWord2 = uniqueString("metastases");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient has ${uniqueWord1}</div>`,
            },
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient has ${uniqueWord2}</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Condition?_text=${uniqueWord1} OR ${uniqueWord2}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text parameter with OR logic successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            2,
            "Bundle should contain two entries",
        );
        assertTrue(
            bundle.entry.every((entry) =>
                (entry.resource as Condition).text?.div?.includes(
                    uniqueWord1,
                ) ||
                (entry.resource as Condition).text?.div?.includes(
                    uniqueWord2,
                )
            ),
            "Returned Conditions should contain either of the search words in narrative",
        );
    });

    it("Should search using _content parameter across entire resource content", async () => {
        const uniqueWord = uniqueString("contentTest");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: uniqueWord,
            valueString: "This is a test observation",
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_content=${uniqueWord}`,
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
        assertEquals(
            (bundle.entry[0].resource as Observation).code?.text,
            uniqueWord,
            "Returned Observation should contain the search word in code.text",
        );
    });

    it("Should search using _content parameter with multiple words and logical operators", async () => {
        const uniqueWord1 = uniqueString("contentTest1");
        const uniqueWord2 = uniqueString("contentTest2");
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestObservation(context, patient.id!, {
            code: uniqueWord1,
            valueString: `This is a test observation with ${uniqueWord2}`,
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_content=${uniqueWord1} AND ${uniqueWord2}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _content parameter with logical operators successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        const observation = bundle.entry[0].resource as Observation;
        assertEquals(
            observation.code?.text,
            uniqueWord1,
            "Returned Observation should contain the first search word in code.text",
        );
        assertEquals(
            observation.valueString?.includes(uniqueWord2),
            true,
            "Returned Observation should contain the second search word in valueString",
        );
    });

    it("Should handle sophisticated text search with proximity and thesaurus considerations", async () => {
        // Note: This test is a placeholder and may need to be adjusted based on your server's specific text search capabilities
        const patient = await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${patient.id}` },
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient has bone cancer with metastases to the liver</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Condition?_text="bone cancer"~10 AND (liver OR hepatic)`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process sophisticated text search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });
}
