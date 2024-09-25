import { fetchWrapper } from "../tests/utils/fetch.ts";
import { ITestContext } from "../tests/types.ts";
import { assertEquals, assertExists, it } from "../../deps.test.ts";
import { Bundle } from "npm:@types/fhir/r4.d.ts";
import { walk } from "https://deno.land/std/fs/mod.ts";

// deno-lint-ignore require-await
export async function runBundleImportTests(_context: ITestContext): Promise<string[]> {
    const patientIds: string[] = [];

    it("Import bundles from JSON files", async () => {
        const bundlesDir = "./bundles";

        for await (const entry of walk(bundlesDir, { exts: [".json"] })) {
            if (entry.isFile) {
                const fileContent = await Deno.readTextFile(entry.path);
                const bundle: Bundle = JSON.parse(fileContent);

                const response = await fetchWrapper({
                    authorized: true,
                    relativeUrl: "",
                    method: "POST",
                    body: JSON.stringify(bundle),
                });

                console.log(JSON.stringify(response, null, 4));
                const bundleResponseType = `${bundle.type}-response`;
                assertEquals(response.status, 200, `Bundle import for ${entry.name} should be successful`);
                const responseBundle = response.jsonBody as Bundle;
                assertEquals(responseBundle.type, bundleResponseType, `Response should be a ${bundleResponseType}`);
                assertExists(responseBundle.entry, "Response bundle should have entries");

                for (const entry of responseBundle.entry || []) {
                    if (entry.response?.status?.startsWith("20") && entry.response.location) {
                        const resourceType = entry.response.location.split("/")[0];
                        const resourceId = entry.response.location.split("/")[1];
                        if (resourceType === "Patient") {
                            patientIds.push(resourceId);
                        }
                    }
                }

                console.log(`Successfully imported bundle from ${entry.name}`);
                console.log(`Patient IDs found: ${patientIds.join(", ")}`);
            }
        }

        console.log(`Total Patient IDs found: ${patientIds.length}`);
    });

    return patientIds;
}