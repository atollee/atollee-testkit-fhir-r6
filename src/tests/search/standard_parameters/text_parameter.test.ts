// tests/search/parameters/text_parameter.test.ts

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
import { Bundle, Observation } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runTextParameterTests(context: ITestContext) {
    it("Should find resources with specific text in narrative", async () => {
        const uniqueText = uniqueString("TestCancer");
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: "test-code",
                text: {
                    status: "generated",
                    div: `<div xmlns="http://www.w3.org/1999/xhtml">${uniqueText} was observed</div>`,
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_text=${uniqueText}`,
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
            (bundle.entry[0].resource as Observation).text?.div?.includes(
                uniqueText,
            ),
            "Returned Observation should contain the search text in narrative",
        );
    });

    it("Should find resources with text in code.text", async () => {
        const uniqueText = uniqueString("TestMetastases");
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: `Observation of ${uniqueText}`,
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_text=${uniqueText}`,
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
        assertEquals(
            (bundle.entry[0].resource as Observation).code?.text?.includes(
                uniqueText,
            ),
            true,
            "Returned Observation should contain the search text in code.text",
        );
    });

    it("Should support OR logic in _text parameter", async () => {
        const uniqueText1 = uniqueString("TestCancer");
        const uniqueText2 = uniqueString("TestMetastases");
        const uniqueText3 = uniqueString("TestTumor");

        await createTestObservation(context, context.getValidPatientId(), {
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${uniqueText1} was observed</div>`,
            },
        });

        await createTestObservation(context, context.getValidPatientId(), {
            code: `Observation of ${uniqueText2}`,
        });

        await createTestObservation(context, context.getValidPatientId(), {
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${uniqueText3} was noted</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_text=${uniqueText1} OR ${uniqueText2} OR ${uniqueText3}`,
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
            3,
            "Bundle should contain three entries",
        );
    });

    it("Should work with _text across different resource types", async () => {
        const uniqueText = uniqueString("TestAcrossTypes");

        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">Patient with ${uniqueText}</div>`,
            },
        });

        await createTestCondition(context, {
            subject: { reference: `Patient/${context.getValidPatientId()}` },
            code: { text: `Condition related to ${uniqueText}` },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_text=${uniqueText}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text parameter across resource types successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length >= 2,
            "Bundle should contain at least two entries",
        );
        assertTrue(
            bundle.entry.some((entry) =>
                entry.resource?.resourceType === "Patient"
            ) &&
                bundle.entry.some((entry) =>
                    entry.resource?.resourceType === "Condition"
                ),
            "Bundle should contain both Patient and Condition resources",
        );
    });

    it("Should not find resources when _text doesn't match", async () => {
        const uniqueText = uniqueString("TestNoMatch");

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_text=${uniqueText}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    it("Should handle partial word matches in _text search", async () => {
        const uniqueText = uniqueString("TestPartial");
        await createTestObservation(context, context.getValidPatientId(), {
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">This is a ${uniqueText}Word observation</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_text=${uniqueText}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process partial word _text parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });

    it("Should combine _text with other search parameters", async () => {
        const uniqueText = uniqueString("TestCombined");
        const uniqueCode = uniqueString("TestCode");
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueCode,
            text: {
                status: "generated",
                div: `<div xmlns="http://www.w3.org/1999/xhtml">${uniqueText} observation</div>`,
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_text=${uniqueText}&code=${uniqueCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _text with other parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 1, "Bundle should contain one entry");
        assertEquals(
            (bundle.entry[0].resource as Observation).code?.coding?.[0].code,
            uniqueCode,
            "Returned Observation should have the correct code",
        );
    });
}
