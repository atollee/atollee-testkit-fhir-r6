import { getAccessToken } from "../tests/utils/oauth.ts";
import { ITestContext } from "../tests/types.ts";
import { afterAll, beforeAll, describe } from "../../deps.test.ts";
import { CONFIG } from "../tests/config.ts";
import { runBundleImportTests } from "./bundle_import.ts";
import { createTestContext } from "../tests/utils/testContext.ts";

export async function importBundleSuite(callback: () => void) {
    let accessToken: string | undefined;

    beforeAll(async () => {
        accessToken = await getAccessToken();
    });

    afterAll(() => {
        if (callback) {
            callback();
        }
    });

    const testContext: ITestContext = createTestContext(accessToken);

    describe("Bundle Import", () => {
        runBundleImportTests(testContext);
    });
}
