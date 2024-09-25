import { getAccessToken } from "./utils/oauth.ts";
import { ITestContext } from "./types.ts";
import { runBaseTests } from "./restful/base/BasePatient.test.ts";
import { afterAll, beforeAll, describe } from "../../deps.test.ts";
import { runServiceBaseUrlTests } from "./restful/base/serviceBaseUrl.test.ts";
import { runServiceBaseUrlIdentityTests } from "./restful/base/serviceBaseUrl.identity.test.ts";
import { CONFIG } from "./config.ts";
import { runResourceMetadataVersioningTests } from "./restful/resourceMetadataAndVersioning/resource-metadata-versioning.test.ts";
import { runSecurityTests } from "./restful/general/security.test.ts";
import { runHttpStatusCodeTests } from "./restful/general/http-status-codes.test.ts";
import { runHttpHeaderTests } from "./restful/general/http-headers.test.ts";
import { runManagingReturnContentTests } from "./restful/general/managing-return-content.test.ts";
import { runCreateUpdatePatchTransactionTests } from "./restful/general/create-update-patch-transaction.test.ts";
import { runContentTypesAndEncodingsTests } from "./restful/general/content-types-and-encodings.test.ts";
import { runFhirVersionParameterTests } from "./restful/general/fhir-version-parameter.test.ts";
import { runGeneralParametersTests } from "./restful/general/general-parameters.test.ts";
import { runVersionSupportTests } from "./restful/general/version-support.test.ts";
import { runClientTimezoneTests } from "./restful/general/client-timezone.test.ts";
import { runVreadTests } from "./restful/read/vread.test.ts";
import { runUpdateTests } from "./restful/read/update.test.ts";
import { runUpdateAsCreateTests } from "./restful/read/update_as_create.test.ts";
import { runRejectingUpdatesTests } from "./restful/read/rejecting_updates.test.ts";
import { runConditionalReadTests } from "./restful/general/conditional-read.test.ts";
import { runConditionalUpdateTests } from "./restful/read/conditional_update.test.ts";
import { runManagingResourceContentionTests } from "./restful/resourceManagement/managing_resource_contention.test.ts";
import { runPatchTests } from "./restful/resourceManagement/patch.test.ts";
import { runConditionalPatchTests } from "./restful/resourceManagement/conditional_patch.test.ts";
import { runPatchJsonBatchTransactionTests } from "./restful/resourceManagement/patch_json_batch_transaction.test.ts";
import { runDeleteTests } from "./restful/resourceManagement/delete.test.ts";
import { runBatchMedsAllergiesTest } from "./restful/search/batch_meds_allergies.test.ts";
import { runExampleTransactionTest } from "./restful/search/example_transaction.test.ts";
import { runBatchTransactionTests } from "./restful/search/batch_transaction.test.ts";
import { runCapabilitiesTests } from "./restful/search/capabilities.test.ts";
import { runSearchMethodChoiceTests } from "./restful/search/search_method_choice.test.ts";
import { runSearchGetTests } from "./restful/search/search_get.test.ts";
import { runSearchTests } from "./restful/search/search.test.ts";
import { runConditionalCreateTests } from "./restful/create/conditional_create.test.ts";
import { runCreateTests } from "./restful/create/create.test.ts";
import { runConditionalDeleteTests } from "./restful/resourceManagement/conditional_delete.test.ts";
import { runAdvancedSearchTests } from "./restful/search/advanced_search.test.ts";
import { runAcceptingOtherBundleTypesTests } from "./restful/batch/accepting_other_bundle_types.test.ts";
import { runBatchProcessingRulesTests } from "./restful/batch/batch_processing_rules.test.ts";
import { runBatchTransactionResponseTests } from "./restful/batch/batch_transaction_response.test.ts";
import { runReplacingHyperlinksAndFullUrlsTests } from "./restful/batch/replacing_hyperlinks_and_fullurls.test.ts";
import { runTransactionProcessingRulesTests } from "./restful/batch/transaction_processing_rules.test.ts";
import {
    runVersionSpecificAndConditionalReferencesTests,
} from "./restful/batch/version_specific_and_conditional_references.test.ts";
import { runCustomHeadersTests } from "./restful/headers/custom_headers.test.ts";
import { runHeadSupportTests } from "./restful/head/head_support.test.ts";
import { runPagingContinuityIntegrityTests } from "./restful/paging/paging_continuity_integrity.test.ts";
import { runPagingTests } from "./restful/paging/paging.test.ts";
import { runConformanceTransactionIntegrityTests } from "./restful/transactional/conformance_transaction_integrity.test.ts";
import { runTransactionalIntegrityTests } from "./restful/transactional/transactional_integrity.test.ts";
import { runHistoryTests } from "./restful/history/history.test.ts";
import { runReadTests } from "./restful/read/read.test.ts";

// deno-lint-ignore require-await
export async function testSuite(callback: () => void) {
    let accessToken: string | undefined;

    beforeAll(async () => {
        accessToken = await getAccessToken();
    });

    afterAll(() => {
        if (callback) {
            callback();
        }
    });

    const testContext: ITestContext = {
        getAccessToken: () => accessToken || "",
        getBaseUrl: () => CONFIG.fhirServerUrl,
        getValidPatientId: () => CONFIG.validPatientId,
        getWritableValidPatient: () => CONFIG.writableValidPatientId,
        getValidTimezone: () => "Europe/Berlin",
        isTurtleSupported: () => false,
        isXmlSupported: () => false,
        isClientDefinedIdsAllowed: () => CONFIG.clientDefinedIdsAllowed,
        isReferentialIntegritySupported: () =>
            CONFIG.referentialIntegritySupported,
        areReferencesVersionSpecific: () => CONFIG.referencesAreVersionSpecific,
        isHttpSupported: () => CONFIG.httpSupported,
        getDefaultPageSize: () => CONFIG.defaultPageSize,
        isPaginationSupported: () => CONFIG.paginationSupported,
    };

    const exclude = false;
    if (!exclude) {
        describe("3.2.0.1.2 Service Base URL", () => {
            runBaseTests(testContext);
            runServiceBaseUrlTests(testContext);
            runServiceBaseUrlIdentityTests(testContext);
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
        describe("3.2.0.13.1 Conformance", () => {
            runConformanceTransactionIntegrityTests(testContext);
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
