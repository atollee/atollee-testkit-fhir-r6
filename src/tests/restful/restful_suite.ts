import { getAccessToken } from "../utils/oauth.ts";
import { ITestContext } from "../types.ts";
import { runBaseTests } from "./base/BasePatient.test.ts";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
} from "../../../deps.test.ts";
import { runServiceBaseUrlTests } from "./base/serviceBaseUrl.test.ts";
import { runServiceBaseUrlIdentityTests } from "./base/serviceBaseUrl.identity.test.ts";
import { runResourceMetadataVersioningTests } from "./resourceMetadataAndVersioning/resource-metadata-versioning.test.ts";
import { runSecurityTests } from "./general/security.test.ts";
import { runHttpStatusCodeTests } from "./general/http-status-codes.test.ts";
import { runHttpHeaderTests } from "./general/http-headers.test.ts";
import { runManagingReturnContentTests } from "./general/managing-return-content.test.ts";
import { runCreateUpdatePatchTransactionTests } from "./general/create-update-patch-transaction.test.ts";
import { runContentTypesAndEncodingsTests } from "./general/content-types-and-encodings.test.ts";
import { runFhirVersionParameterTests } from "./general/fhir-version-parameter.test.ts";
import { runGeneralParametersTests } from "./general/general-parameters.test.ts";
import { runVersionSupportTests } from "./general/version-support.test.ts";
import { runClientTimezoneTests } from "./general/client-timezone.test.ts";
import { runVreadTests } from "./read/vread.test.ts";
import { runUpdateTests } from "./read/update.test.ts";
import { runUpdateAsCreateTests } from "./read/update_as_create.test.ts";
import { runRejectingUpdatesTests } from "./read/rejecting_updates.test.ts";
import { runConditionalReadTests } from "./general/conditional-read.test.ts";
import { runConditionalUpdateTests } from "./read/conditional_update.test.ts";
import { runManagingResourceContentionTests } from "./resourceManagement/managing_resource_contention.test.ts";
import { runPatchTests } from "./resourceManagement/patch.test.ts";
import { runConditionalPatchTests } from "./resourceManagement/conditional_patch.test.ts";
import { runPatchJsonBatchTransactionTests } from "./resourceManagement/patch_json_batch_transaction.test.ts";
import { runDeleteTests } from "./resourceManagement/delete.test.ts";
import { runBatchMedsAllergiesTest } from "./search/batch_meds_allergies.test.ts";
import { runExampleTransactionTest } from "./search/example_transaction.test.ts";
import { runBatchTransactionTests } from "./search/batch_transaction.test.ts";
import { runCapabilitiesTests } from "./search/capabilities.test.ts";
import { runSearchMethodChoiceTests } from "./search/search_method_choice.test.ts";
import { runSearchGetTests } from "./search/search_get.test.ts";
import { runSearchTests } from "./search/search.test.ts";
import { runConditionalCreateTests } from "./create/conditional_create.test.ts";
import { runCreateTests } from "./create/create.test.ts";
import { runConditionalDeleteTests } from "./resourceManagement/conditional_delete.test.ts";
import { runAdvancedSearchTests } from "./search/advanced_search.test.ts";
import { runAcceptingOtherBundleTypesTests } from "./batch/accepting_other_bundle_types.test.ts";
import { runBatchProcessingRulesTests } from "./batch/batch_processing_rules.test.ts";
import { runBatchTransactionResponseTests } from "./batch/batch_transaction_response.test.ts";
import { runReplacingHyperlinksAndFullUrlsTests } from "./batch/replacing_hyperlinks_and_fullurls.test.ts";
import { runTransactionProcessingRulesTests } from "./batch/transaction_processing_rules.test.ts";
import {
    runVersionSpecificAndConditionalReferencesTests,
} from "./batch/version_specific_and_conditional_references.test.ts";
import { runCustomHeadersTests } from "./headers/custom_headers.test.ts";
import { runHeadSupportTests } from "./head/head_support.test.ts";
import { runPagingContinuityIntegrityTests } from "./paging/paging_continuity_integrity.test.ts";
import { runPagingTests } from "./paging/paging.test.ts";
import { runTransactionalIntegrityTests } from "./transactional/transactional_integrity.test.ts";
import { runHistoryTests } from "./history/history.test.ts";
import { runReadTests } from "./read/read.test.ts";
import { createTestContext } from "../utils/testContext.ts";
import { updateRandomText } from "../utils/resource_creators.ts";

// deno-lint-ignore require-await
export async function restfulSuite(callback: () => void) {
    let accessToken: string | undefined;

    beforeAll(async () => {
        accessToken = await getAccessToken();
    });

    beforeEach(() => {
        updateRandomText();
    });

    afterAll(() => {
        if (callback) {
            callback();
        }
    });

    const testContext: ITestContext = createTestContext(accessToken);

    const exclude = false;
    if (!exclude) {
        describe("3.2.0.1.3 Resource Metadata and Versioning", () => {
            runResourceMetadataVersioningTests(testContext);
        });
        describe("3.2.0.1.4 Security", () => {
            runSecurityTests(testContext);
        });
        describe("3.2.0.1.5 HTTP Status Codes", async () => {
            await runHttpStatusCodeTests(testContext);
        });
        describe("3.2.0.1.6 HTTP Headers ", () => {
            runHttpHeaderTests(testContext);
        });
        describe("3.2.0.1.7 Managing Return Content", () => {
            runManagingReturnContentTests(testContext);
        });

        describe("3.2.0.1.2 Service Base URL", async () => {
            runBaseTests(testContext);
            runServiceBaseUrlTests(testContext);
            await runServiceBaseUrlIdentityTests(testContext);
        });
        describe("3.2.0.1.3 Resource Metadata and Versioning", () => {
            runResourceMetadataVersioningTests(testContext);
        });
        describe("3.2.0.1.4 Security", () => {
            runSecurityTests(testContext);
        });
        describe("3.2.0.1.5 HTTP Status Codes", () => {
            runHttpStatusCodeTests(testContext);
        });
        describe("3.2.0.1.6 HTTP Headers ", () => {
            runHttpHeaderTests(testContext);
        });
        describe("3.2.0.1.7 Managing Return Content", () => {
            runManagingReturnContentTests(testContext);
        });
        describe("3.2.0.1.8 conditional read", () => {
            runConditionalReadTests(testContext);
        });
        describe("3.2.0.1.9 create/update/patch/transaction", () => {
            runCreateUpdatePatchTransactionTests(testContext);
        });
        describe("3.2.0.1.10 Content Types and encodings", () => {
            runContentTypesAndEncodingsTests(testContext);
        });
        describe("3.2.0.1.11 FHIR Version Parameter", () => {
            runFhirVersionParameterTests(testContext);
        });
        describe("3.2.0.1.12 General parameters", () => {
            runGeneralParametersTests(testContext);
        });
        describe("3.2.0.1.13 Support for Versions", () => {
            runVersionSupportTests(testContext);
        });
        describe("3.2.0.1.14 Client Timezone", () => {
            runClientTimezoneTests(testContext);
        });
        describe("3.2.0.2 read", () => {
            runReadTests(testContext);
        });
        describe("3.2.0.3 vread", () => {
            runVreadTests(testContext);
        });
        describe("3.2.0.4 update", () => {
            runUpdateTests(testContext);
        });
        describe("3.2.0.4.1 Update as Create", () => {
            runUpdateAsCreateTests(testContext);
        });
        describe("3.2.0.4.2 Rejecting Updates", () => {
            runRejectingUpdatesTests(testContext);
        });
        describe("3.2.0.4.3 Conditional update", () => {
            runConditionalUpdateTests(testContext);
        });
        describe("3.2.0.5 Managing Resource Contention", () => {
            runManagingResourceContentionTests(testContext);
        });
        describe("3.2.0.6 patch", () => {
            runPatchTests(testContext);
        });
        describe("3.2.0.6.1 Conditional patch", () => {
            runConditionalPatchTests(testContext);
        });
        describe("3.2.0.6.2 Patch Using JSON Patch (batch/transaction)", () => {
            runPatchJsonBatchTransactionTests(testContext);
        });
        describe("3.2.0.7 delete", () => {
            runDeleteTests(testContext);
        });
        describe("3.2.0.7.1 Conditional delete", () => {
            runConditionalDeleteTests(testContext);
        });
        describe("3.2.0.8 create", () => {
            runCreateTests(testContext);
        });
        describe("3.2.0.8.1 Conditional create", () => {
            runConditionalCreateTests(testContext);
        });
        describe("3.2.0.9.1 HTTP POST", () => {
            runSearchTests(testContext);
        });
        describe("3.2.0.9.2 HTTP GET", () => {
            runSearchGetTests(testContext);
        });
        describe("3.2.0.9.3 Choosing an HTTP Method", () => {
            runSearchMethodChoiceTests(testContext);
            runAdvancedSearchTests(testContext);
        });
        describe("3.2.0.10 capabilities", () => {
            runCapabilitiesTests(testContext);
        });
        describe("3.2.0.11 batch/transaction", () => {
            runBatchTransactionTests(testContext);
        });
        describe("3.2.0.11 batch/transaction - Examples", () => {
            runExampleTransactionTest(testContext);
            runBatchMedsAllergiesTest(testContext);
        });
        describe("3.2.0.11.1 Batch Processing Rules", () => {
            runBatchProcessingRulesTests(testContext);
        });
        describe("3.2.0.11.2 Transaction Processing Rules", () => {
            runTransactionProcessingRulesTests(testContext);
        });
        describe("3.2.0.11.3 Replacing hyperlinks and full-urls", () => {
            runReplacingHyperlinksAndFullUrlsTests(testContext);
        });
        describe("3.2.0.11.4 Version specific references and updates", () => {
            runVersionSpecificAndConditionalReferencesTests(testContext);
        });
        describe("3.2.0.11.4 Version specific references and updates", () => {
            runVersionSpecificAndConditionalReferencesTests(testContext);
        });
        describe("3.2.0.11.5 Batch/Transaction Response", () => {
            runBatchTransactionResponseTests(testContext);
        });
        describe("3.2.0.11.6 Accepting other Bundle types", () => {
            runAcceptingOtherBundleTypesTests(testContext);
        });
        describe("3.2.0.12 History", () => {
            runHistoryTests(testContext);
        });
        describe("3.2.0.13 Transactional Integrity", () => {
            runTransactionalIntegrityTests(testContext);
        });
        describe("3.2.0.14 Paging", () => {
            runPagingTests(testContext);
        });
        describe("3.2.0.14.1 Paging Continuity & Integrity", () => {
            runPagingContinuityIntegrityTests(testContext);
        });
        describe("3.2.0.15 Support for HEAD", () => {
            runHeadSupportTests(testContext);
        });
        describe("3.2.0.16 Custom Headers", () => {
            runCustomHeadersTests(testContext);
        });
    }
}
