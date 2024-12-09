import { assertEquals, it } from "../../../../deps.test.ts";
import { fetchSearchWrapper } from "../../utils/fetch.ts";
import { ITestContext } from "../../types.ts";

export function runStandardParametersTests(_context: ITestContext) {
    it("Should support standard search parameters listed in the specification", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl:
                "Patient?_lastUpdated=gt2020-01-01&_profile=http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request with standard parameters successfully",
        );
    });

    it("Should support all permitted modifiers for base SearchParameters", async () => {
        const response = await fetchSearchWrapper({
            authorized: true,
            relativeUrl: "Patient?name:exact=John&address:contains=Main",
        });

        assertEquals(
            response.status,
            200,
            "Server should process the request with modifiers successfully",
        );
    });
}
