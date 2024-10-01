// tests/search/parameters/security_parameter.test.ts

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

export function runSecurityParameterTests(context: ITestContext) {
    const securitySystem =
        "http://terminology.hl7.org/CodeSystem/v3-Confidentiality";
    const securityCode = "R";

    it("Should find resources with a specific security label", async () => {
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: {
                    security: [{ system: securitySystem, code: securityCode }],
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_security=${securitySystem}|${securityCode}`,
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
        assertEquals(
            (bundle.entry[0].resource as Observation).meta?.security?.[0].code,
            securityCode,
            "Returned Observation should have the correct security label",
        );
    });

    it("Should not find resources without the specified security label", async () => {
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
            meta: { security: [{ system: securitySystem, code: "N" }] },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_security=${securitySystem}|${securityCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security parameter successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertEquals(bundle.total, 0, "Bundle should contain no entries");
    });

    it("Should find resources with multiple security labels", async () => {
        await createTestObservation(
            context,
            context.getValidPatientId(),
            {
                code: uniqueString("TestCode"),
                meta: {
                    security: [
                        { system: securitySystem, code: securityCode },
                        {
                            system: "http://example.com/security",
                            code: "custom",
                        },
                    ],
                },
            },
        );

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_security=${securitySystem}|${securityCode}&_security=http://example.com/security|custom`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process multiple _security parameters successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
        const returnedSecurity = (bundle.entry[0].resource as Observation).meta
            ?.security;
        assertTrue(
            returnedSecurity?.some((s) =>
                s.system === securitySystem && s.code === securityCode
            ),
            "Returned Observation should have the first security label",
        );
        assertTrue(
            returnedSecurity?.some((s) =>
                s.system === "http://example.com/security" &&
                s.code === "custom"
            ),
            "Returned Observation should have the second security label",
        );
    });

    it("Should work with _security across different resource types", async () => {
        await createTestPatient(context, {
            name: [{ given: ["TestPatient"] }],
            meta: {
                security: [{ system: securitySystem, code: securityCode }],
            },
        });
        await createTestCondition(context, {
            subject: { reference: `Patient/${context.getValidPatientId()}` },
            meta: {
                security: [{ system: securitySystem, code: securityCode }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `?_security=${securitySystem}|${securityCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security parameter across resource types successfully",
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

    it("Should handle invalid security label", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_security=invalid-security-label`,
        });

        assertEquals(
            response.status,
            400,
            "Server should return 400 for invalid security label",
        );
    });

    it("Should combine _security with other search parameters", async () => {
        const uniqueCode = uniqueString("TestCode");
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueCode,
            meta: {
                security: [{ system: securitySystem, code: securityCode }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl:
                `Observation?_security=${securitySystem}|${securityCode}&code=${uniqueCode}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security with other parameters successfully",
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

    it("Should find resources with only system specified", async () => {
        await createTestObservation(context, context.getValidPatientId(), {
            code: uniqueString("TestCode"),
            meta: {
                security: [{ system: securitySystem, code: securityCode }],
            },
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?_security=${securitySystem}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process _security parameter with only system successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertTrue(
            bundle.entry.length > 0,
            "Bundle should contain at least one entry",
        );
    });
}
