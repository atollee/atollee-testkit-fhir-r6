import { getAccessToken } from "../utils/oauth.ts";
import { ITestContext } from "../types.ts";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
} from "../../../deps.test.ts";
import { updateRandomText } from "../utils/resource_creators.ts";
import { createTestContext } from "../utils/testContext.ts";
import { runValidateTests } from "./validate/validate.test.ts";

export async function operationsSuite(callback: () => void) {
    let accessToken: string | undefined;

    beforeAll(async () => {
        accessToken = await getAccessToken();
    });

    afterAll(() => {
        if (callback) {
            callback();
        }
    });

    beforeEach(() => {
        updateRandomText();
    });
    const testContext: ITestContext = createTestContext(accessToken);
    describe("2.1.27.5.8.1 Operation $validate on Resource", () => {
        runValidateTests(testContext);
    });
}
