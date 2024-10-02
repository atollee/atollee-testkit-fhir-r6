// tests/search/parameters/above_modifier_reference.test.ts

import { assertEquals, assertExists, assertFalse, assertTrue, it } from "../../../../../deps.test.ts";
import { fetchWrapper } from "../../../utils/fetch.ts";
import { createTestLocation, createTestPatient, createTestProcedure } from "../../../utils/resource_creators.ts";
import { Bundle, Location, OperationOutcome, Procedure } from "npm:@types/fhir/r4.d.ts";
import { ITestContext } from "../../../types.ts";

function uniqueString(base: string): string {
    return `${base}-${Date.now()}`;
}

export function runAboveModifierReferenceTests(context: ITestContext) {
    it("Should find procedures in a specific location and its parent locations", async () => {
        // Create a hierarchy of locations
        const buildingA = await createTestLocation(context, { name: uniqueString("BuildingA") });
        const floorA1 = await createTestLocation(context, { name: uniqueString("FloorA1"), partOf: { reference: `Location/${buildingA.id}` } });
        const roomA101 = await createTestLocation(context, { name: uniqueString("RoomA101"), partOf: { reference: `Location/${floorA1.id}` } });

        // Create procedures in different locations
        const procedureInRoom = await createTestProcedure(context, { location: { reference: `Location/${roomA101.id}` } });
        const procedureInFloor = await createTestProcedure(context, { location: { reference: `Location/${floorA1.id}` } });
        const procedureInBuilding = await createTestProcedure(context, { location: { reference: `Location/${buildingA.id}` } });
        const procedureElsewhere = await createTestProcedure(context, {});

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Procedure?location:above=${roomA101.id}`,
        });

        assertEquals(response.status, 200, "Server should process search with above modifier successfully");
        const bundle = response.jsonBody as Bundle;
        assertExists(bundle.entry, "Bundle should contain entries");
        assertEquals(bundle.entry.length, 3, "Bundle should contain three matching Procedures");

        const procedureIds = bundle.entry.map(entry => (entry.resource as Procedure).id);
        assertTrue(procedureIds.includes(procedureInRoom.id), "Results should include procedure in the room");
        assertTrue(procedureIds.includes(procedureInFloor.id), "Results should include procedure in the floor");
        assertTrue(procedureIds.includes(procedureInBuilding.id), "Results should include procedure in the building");
        assertFalse(procedureIds.includes(procedureElsewhere.id), "Results should not include procedure elsewhere");
    });

    it("Should handle different reference formats with above modifier", async () => {
        const building = await createTestLocation(context, { name: uniqueString("Building") });
        const floor = await createTestLocation(context, { name: uniqueString("Floor"), partOf: { reference: `Location/${building.id}` } });
        const room = await createTestLocation(context, { name: uniqueString("Room"), partOf: { reference: `Location/${floor.id}` } });

        const procedureInRoom = await createTestProcedure(context, { location: { reference: `Location/${room.id}` } });

        // Test with different reference formats
        const formats = [
            room.id,
            `Location/${room.id}`,
            `${context.getBaseUrl()}/Location/${room.id}`,
        ];

        for (const format of formats) {
            const response = await fetchWrapper({
                authorized: true,
                relativeUrl: `Procedure?location:above=${format}`,
            });

            assertEquals(response.status, 200, `Server should process search with above modifier and reference format ${format} successfully`);
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(bundle.entry.length, 1, "Bundle should contain one matching Procedure");
            assertEquals((bundle.entry[0].resource as Procedure).id, procedureInRoom.id, "Returned procedure should match the one created");
        }
    });

    it("Should not apply above modifier to non-hierarchical references", async () => {
        const patient = await createTestPatient(context, {});
        const linkedPatient = await createTestPatient(context, { link: [{ other: { reference: `Patient/${patient.id}` }, type: "seealso" }] });

        const response = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?link:above=${patient.id}`,
        });

        // The expected behavior here might vary depending on your server implementation.
        // Some servers might return an error, others might ignore the modifier and perform a regular search.
        // Adjust the assertions based on your server's expected behavior.

        if (response.status === 400) {
            // If your server returns an error for invalid use of :above
            const operationOutcome = response.jsonBody as OperationOutcome;
            assertExists(operationOutcome.issue, "OperationOutcome should contain issues");
            assertTrue(operationOutcome.issue.some(issue => issue.severity === "error"), "OperationOutcome should contain an error");
        } else {
            assertEquals(response.status, 200, "Server should process the search request");
            const bundle = response.jsonBody as Bundle;
            assertExists(bundle.entry, "Bundle should contain entries");
            assertEquals(bundle.entry.length, 0, "Bundle should not contain any matching Patients");
        }
    });
}