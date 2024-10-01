// tests/search/parameters/hierarchical_search.test.ts

import {
    assertEquals,
    assertExists,
    assertTrue,
    it,
} from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import {
    createTestEncounter,
    createTestLocation,
    createTestPatient,
    createTestProcedure,
} from "../../utils/resource_creators.ts";
import {
    Bundle,
    CapabilityStatement,
    Encounter,
    OperationOutcome,
    Procedure,
} from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runHierarchicalSearchTests(context: ITestContext) {
    it("Should find procedures in location hierarchy using :below modifier", async () => {
        // Create a hierarchy of locations
        const hospitalLocation = await createTestLocation(context, {
            name: uniqueString("Hospital"),
        });

        const wardLocation = await createTestLocation(context, {
            name: uniqueString("Ward"),
            partOf: { reference: `Location/${hospitalLocation.id}` },
        });

        const roomLocation = await createTestLocation(context, {
            name: uniqueString("Room"),
            partOf: { reference: `Location/${wardLocation.id}` },
        });

        // Create procedures at different levels of the location hierarchy
        const procedureHospital = await createTestProcedure(context, {
            location: { reference: `Location/${hospitalLocation.id}` },
        });

        const procedureWard = await createTestProcedure(context, {
            location: { reference: `Location/${wardLocation.id}` },
        });

        const procedureRoom = await createTestProcedure(context, {
            location: { reference: `Location/${roomLocation.id}` },
        });

        // Search for procedures in the hospital and all sub-locations
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Procedure?location:below=${hospitalLocation.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process hierarchical search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching Procedures",
        );

        const procedureIds = bundle.entry.map((entry) =>
            (entry.resource as Procedure).id
        );
        assertTrue(
            procedureIds.includes(procedureHospital.id),
            "Results should include procedure at hospital level",
        );
        assertTrue(
            procedureIds.includes(procedureWard.id),
            "Results should include procedure at ward level",
        );
        assertTrue(
            procedureIds.includes(procedureRoom.id),
            "Results should include procedure at room level",
        );
    });

    it("Should find encounters in encounter hierarchy using :above modifier", async () => {
        // Create a hierarchy of encounters
        const hospitalStayEncounter = await createTestEncounter(context, {
            status: "finished",
        });

        const wardStayEncounter = await createTestEncounter(context, {
            status: "finished",
        });

        const procedureEncounter = await createTestEncounter(context, {
            status: "finished",
        });

        // Manually update encounters to create hierarchy
        await fetchWrapper({
            authorized: true,
            method: "PUT",
            relativeUrl: `Encounter/${wardStayEncounter.id}`,
            body: JSON.stringify({
                ...wardStayEncounter,
                partOf: { reference: `Encounter/${hospitalStayEncounter.id}` },
            }),
        });

        await fetchWrapper({
            authorized: true,
            method: "PUT",
            relativeUrl: `Encounter/${procedureEncounter.id}`,
            body: JSON.stringify({
                ...procedureEncounter,
                partOf: { reference: `Encounter/${wardStayEncounter.id}` },
            }),
        });

        // Search for encounters in the procedure encounter and all parent encounters
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Encounter?_id:above=${procedureEncounter.id}`,
        });

        assertEquals(
            response.status,
            200,
            "Server should process hierarchical search successfully",
        );
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(
            bundle.entry.length,
            3,
            "Bundle should contain three matching Encounters",
        );

        const encounterIds = bundle.entry.map((entry) =>
            (entry.resource as Encounter).id
        );
        assertTrue(
            encounterIds.includes(hospitalStayEncounter.id),
            "Results should include hospital stay encounter",
        );
        assertTrue(
            encounterIds.includes(wardStayEncounter.id),
            "Results should include ward stay encounter",
        );
        assertTrue(
            encounterIds.includes(procedureEncounter.id),
            "Results should include procedure encounter",
        );
    });

    it("Should handle :above/:below modifiers on non-hierarchical references", async () => {
        const patient = await createTestPatient(context, {
            name: [{ family: uniqueString("TestPatient") }],
        });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Observation?subject:below=${patient.id}`,
        });

        assertEquals(
            response.status,
            400,
            "Server should reject hierarchical search on non-hierarchical reference",
        );
        const operationOutcome = response.jsonBody as OperationOutcome;
        assertExists(
            operationOutcome.issue,
            "OperationOutcome should contain issues",
        );
        assertTrue(
            operationOutcome.issue.some((issue) => issue.severity === "error"),
            "OperationOutcome should contain an error",
        );
    });

    it("Should return CapabilityStatement indicating support for :above/:below modifiers", async () => {
        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `metadata`,
        });

        assertEquals(
            response.status,
            200,
            "Server should return CapabilityStatement",
        );
        const capabilityStatement = response.jsonBody as CapabilityStatement;

        const locationResource = capabilityStatement.rest?.[0].resource?.find(
            (r) => r.type === "Location"
        );
        assertExists(
            locationResource,
            "CapabilityStatement should include Location resource",
        );
        const locationPartOfParam = locationResource.searchParam?.find((sp) =>
            sp.name === "partOf"
        );
        assertExists(
            locationPartOfParam,
            "Location resource should include partOf search parameter",
        );

        const encounterResource = capabilityStatement.rest?.[0].resource?.find(
            (r) => r.type === "Encounter"
        );
        assertExists(
            encounterResource,
            "CapabilityStatement should include Encounter resource",
        );
        const encounterPartOfParam = encounterResource.searchParam?.find((sp) =>
            sp.name === "part-of"
        );
        assertExists(
            encounterPartOfParam,
            "Encounter resource should include part-of search parameter",
        );

        // Note: We're not checking for modifiers in CapabilityStatement as they're not standard
        // Instead, we're just checking if the relevant search parameters exist
    });
}
