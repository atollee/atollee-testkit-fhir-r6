import { getAccessToken } from "../tests/utils/oauth.ts";
import { ITestContext } from "../tests/types.ts";
import { afterAll, beforeAll, describe } from "../../deps.test.ts";
import { CONFIG } from "../tests/config.ts";
import { runBundleImportTests } from "./bundle_import.ts";
import { createTestContext } from "../tests/utils/testContext.ts";

describe({
    name: "FHIR Bundle Import",
    fn: () => {
        let accessToken: string | undefined;

        beforeAll(async () => {
            accessToken = await getAccessToken();
        });

        afterAll(() => {
        });

        const testContext: ITestContext = createTestContext(accessToken);

        describe("3.2.0.1.2 Service Base URL", () => {
            runBundleImportTests(testContext);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false,
});
