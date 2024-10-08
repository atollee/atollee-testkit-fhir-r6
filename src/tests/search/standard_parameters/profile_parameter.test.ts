// tests/search/parameters/profile_parameter.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchSearchWrapper, fetchWrapper } from "../../utils/fetch.ts";
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

export function runProfileParameterTests(context: ITestContext) {
    const bpProfileUrl = "http://hl7.org/fhir/StructureDefinition/bp";

    it("Should find resources with a specific profile", async () => {
        const testProfileUrl = uniqueString(
            "http://example.com/fhir/StructureDefinition/test-profile",
        );
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: { profile: [testProfileUrl] },
            },
        );

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_profile=${testProfileUrl}`,
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
        assertEquals(
            (bundle.entry[0].resource as Observation).meta?.profile?.[0],
            testProfileUrl,
            "Returned Observation should have the correct profile",
        );
    });

    it("Should not find resources without the specified profile", async () => {
        const testProfileUrl = uniqueString(
            "http://example.com/fhir/StructureDefinition/test-profile",
        );
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
            meta: { profile: [testProfileUrl] },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: `Observation?_profile=${bpProfileUrl}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _profile parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    it("Should find resources with multiple profiles", async () => {
        const testProfileUrl = uniqueString(
            "http://example.com/fhir/StructureDefinition/test-profile",
        );

        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: { profile: [testProfileUrl, bpProfileUrl] },
            },
        );

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_profile=${testProfileUrl}&_profile=${bpProfileUrl}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _profile parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        assertTrue(
            (bundle.entry[0].resource as Observation).meta?.profile?.includes(
                testProfileUrl,
            ),
            "Returned Observation should have the first profile",
        );
        assertTrue(
            (bundle.entry[0].resource as Observation).meta?.profile?.includes(
                bpProfileUrl,
            ),
            "Returned Observation should have the second profile",
        );
    });

    if (context.isMultiTypeSearchSupported()) {
        it("Should work with _profile across different resource types", async () => {
            const testProfileUrl = uniqueString(
                "http://example.com/fhir/StructureDefinition/test-profile",
            );

            await createTestPatient(context, {
                name: [{ given: ["TestPatient"] }],
                meta: { profile: [testProfileUrl] },
            });
            await createTestCondition(context, {
                subject: {
                    reference: `Patient/${context.getValidPatientId()}`,
                },
                meta: { profile: [testProfileUrl] },
            });

            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `?_profile=${testProfileUrl}`,
            });

            assertEquals(
                response.status,
                200,
                "Server should process _profile parameter across resource types successfully",
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
        it("Should handle invalid profile URL", async () => {
            const response = await fetchSearchWrapper({
                authorized: true,
                relativeUrl: `Observation?_profile=invalid-url`,
            });

            assertTrue(
                response.status >= 400,
                "Server should return 400 for invalid profile URL",
            );
        });
    }

    it("Should combine _profile with other search parameters", async () => {
        const testProfileUrl = uniqueString(
            "http://example.com/fhir/StructureDefinition/test-profile",
        );

        const uniqueCode = uniqueString("TestCode");
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueCode,
            meta: { profile: [testProfileUrl] },
        });

        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_profile=${testProfileUrl}&code=${uniqueCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _profile with other parameters successfully",
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
