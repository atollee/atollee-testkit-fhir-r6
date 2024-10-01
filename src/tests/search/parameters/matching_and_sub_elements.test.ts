import { assertEquals, it } from "../../../../deps.test.ts";
import { fetchWrapper } from "../../utils/fetch.ts";
import { createTestPatient } from "../../utils/resource_creators.ts";
import { Bundle, Patient } from "npm:@types/fhir/r4.d.ts";
import { assertTrue } from "../../../../deps.test.ts";
import { ITestContext } from "../../types.ts";

export function runMatchingAndSubElementsTests(context: ITestContext) {
    it("should match patient when searching by name (complex element)", async () => {
        // Create a test patient with a complex name
        const patient = await createTestPatient(context, {
            family: "Doe",
            given: ["John", "James"],
        });

        // Search for the patient using the family name
        const responseFamilyName = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${patient.name?.[0].family}`,
        });

        assertEquals(
            responseFamilyName.success,
            true,
            "Search by family name should be successful",
        );
        const bundleFamilyName = responseFamilyName.jsonBody as Bundle;
        assertTrue(
            bundleFamilyName.entry?.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Patient should be found when searching by family name",
        );

        // Search for the patient using the given name
        const responseGivenName = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?name=${patient.name?.[0].given?.[0]}`,
        });

        assertEquals(
            responseGivenName.success,
            true,
            "Search by given name should be successful",
        );
        const bundleGivenName = responseGivenName.jsonBody as Bundle;
        assertTrue(
            bundleGivenName.entry?.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Patient should be found when searching by given name",
        );
    });

    it("should match patient when searching by address (backbone element)", async () => {
        // Create a test patient with a complex address
        const patient = await createTestPatient(context, {
            family: "Smith",
            given: ["Jane"],
        });

        // Add an address to the patient
        patient.address = [{
            use: "home",
            type: "both",
            text: "123 Main St, Anytown, CA 12345",
            line: ["123 Main St"],
            city: "Anytown",
            state: "CA",
            postalCode: "12345",
            country: "USA",
        }];

        // Update the patient with the new address
        await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient/${patient.id}`,
            method: "PUT",
            body: JSON.stringify(patient),
        });

        // Search for the patient using the city
        const responseCity = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?address-city=${patient.address?.[0].city}`,
        });

        assertEquals(
            responseCity.success,
            true,
            "Search by city should be successful",
        );
        const bundleCity = responseCity.jsonBody as Bundle;
        assertTrue(
            bundleCity.entry?.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Patient should be found when searching by city",
        );

        // Search for the patient using the postal code
        const responsePostalCode = await fetchWrapper({
            authorized: true,
            relativeUrl: `Patient?address-postalcode=${
                patient.address?.[0].postalCode
            }`,
        });

        assertEquals(
            responsePostalCode.success,
            true,
            "Search by postal code should be successful",
        );
        const bundlePostalCode = responsePostalCode.jsonBody as Bundle;
        assertTrue(
            bundlePostalCode.entry?.some((entry) =>
                (entry.resource as Patient).id === patient.id
            ),
            "Patient should be found when searching by postal code",
        );
    });
}
