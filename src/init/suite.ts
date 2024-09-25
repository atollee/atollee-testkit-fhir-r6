import { getAccessToken } from "../tests/utils/oauth.ts";
import { ITestContext } from "../tests/types.ts";
import { afterAll, beforeAll, describe } from "../../deps.test.ts";
import { CONFIG } from "../tests/config.ts";
import { runBundleImportTests } from "./bundle_import.ts";

describe({
    name: "FHIR Bundle Import",
    fn: () => {

        let accessToken: string | undefined;

        beforeAll(async () => {
            accessToken = await getAccessToken();
        });

        afterAll(() => {
        });

        const testContext: ITestContext = {
            getAccessToken: () => accessToken || '',
            getBaseUrl: () => CONFIG.fhirServerUrl,
            getValidPatientId: () => CONFIG.validPatientId,
            getWritableValidPatient: () => CONFIG.writableValidPatientId,
            getValidTimezone: () => "Europe/Berlin",
            isTurtleSupported: () => false,
            isXmlSupported: () => false,
            isClientDefinedIdsAllowed: () => CONFIG.clientDefinedIdsAllowed,
            isReferentialIntegritySupported: () => CONFIG.referentialIntegritySupported,
            areReferencesVersionSpecific: () => CONFIG.referencesAreVersionSpecific
        };

        describe('3.2.0.1.2 Service Base URL', () => {
            runBundleImportTests(testContext);
        });
    },
    sanitizeOps: false,
    sanitizeResources: false
});