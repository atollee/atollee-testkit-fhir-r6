// tests/search/parameters/tag_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
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

export function runTagParameterTests(context: ITestContext) {
    it("Should find resources with a specific tag", async () => {
        const tagSystem = uniqueString(
            "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
        );
        const tagCode = uniqueString("H");

        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: { tag: [{ system: tagSystem, code: tagCode }] },
            },
        );

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_tag=${tagSystem}|${tagCode}`,
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
        assertEquals(
            (bundle.entry[0].resource as Observation).meta?.tag?.[0].code,
            tagCode,
            "Returned Observation should have the correct tag",
        );
    });

    it("Should not find resources without the specified tag", async () => {
        const tagSystem = uniqueString(
            "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
        );
        const tagCode = uniqueString("H");

        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
            meta: { tag: [{ system: tagSystem, code: "L" }] },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_tag=${tagSystem}|${tagCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _tag parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    it("Should find resources with multiple tags", async () => {
        const tagSystem = uniqueString(
            "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
        );
        const tagCode = uniqueString("H");

        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: {
                    tag: [
                        { system: tagSystem, code: tagCode },
                        { system: "http://example.com/tags", code: "custom" },
                    ],
                },
            },
        );

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_tag=${tagSystem}|${tagCode}&_tag=http://example.com/tags|custom`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _tag parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        const returnedTags = (bundle.entry[0].resource as Observation).meta
            ?.tag;
        assertTrue(
            returnedTags?.some((t) =>
                t.system === tagSystem && t.code === tagCode
            ),
            "Returned Observation should have the first tag",
        );
        assertTrue(
            returnedTags?.some((t) =>
                t.system === "http://example.com/tags" && t.code === "custom"
            ),
            "Returned Observation should have the second tag",
        );
    });

    if (context.isMultiTypeSearchSupported()) {
        it("Should work with _tag across different resource types", async () => {
            const tagSystem = uniqueString(
                "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
            );
            const tagCode = uniqueString("H");

            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { tag: [{ system: tagSystem, code: tagCode }] },
            });
            await createTestCondition(context, {
                subject: {
                    reference: `Patient/${context.getValidPatientId()}`,
                },
                meta: { tag: [{ system: tagSystem, code: tagCode }] },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `?_tag=${tagSystem}|${tagCode}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _tag parameter across resource types successfully",
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
    }

    if (context.isHapiBugsDisallowed()) {
        it("Should handle invalid tag", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_tag=inva$$lid-tag`,
            });

            assertEquals(
                response.status,
                400,
                "Server should return 400 for invalid tag",
            );
        });
    }

    it("Should combine _tag with other search parameters", async () => {
        const tagSystem = uniqueString(
            "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
        );
        const tagCode = uniqueString("H");

        const uniqueCode = uniqueString("TestCode");
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueCode,
            meta: { tag: [{ system: tagSystem, code: tagCode }] },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_tag=${tagSystem}|${tagCode}&code=${uniqueCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _tag with other parameters successfully",
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

    if (context.isHapiBugsDisallowed()) {
        it("Should find resources with only system specified", async () => {
            const tagSystem = uniqueString(
                "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
            );
            const tagCode = uniqueString("H");

            await createTestObservation(context, context.getValidPatientId(), {
                code: uniqueString("TestCode"),
                meta: { tag: [{ system: tagSystem, code: tagCode }] },
            });

            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_tag=${tagSystem}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _tag parameter with only system successfully",
            );
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertTrue(
                bundle.entry.length > 0,
                "Bundle should contain at least one entry",
            );
        });
    }

    it("Should find resources with only code specified", async () => {
        const tagSystem = uniqueString(
            "http://terminology.hl7.org/ValueSet/v3-SeverityObservation",
        );
        const tagCode = uniqueString("H");

        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
            meta: { tag: [{ system: tagSystem, code: tagCode }] },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_tag=${tagCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _tag parameter with only code successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });
}
