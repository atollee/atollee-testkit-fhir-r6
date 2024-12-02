import { getAccessToken } from "../utils/oauth.ts";
import { ITestContext } from "../types.ts";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
} from "../../../deps.test.ts";
import { runSearchInputTests } from "./base/search_inputs.test.ts";
import { runSearchContextTests } from "./base/search_contexts.test.ts";
import { runBundleTypeTests } from "./responses/bundle_type.test.ts";
import { runSelfLinkTests } from "./responses/self_link.test.ts";
import { runPagingLinksTests } from "./responses/paging_links.test.ts";
import { runBundleEntriesTests } from "./responses/bundle_entries.test.ts";
import { runErrorHandlingBaseTests } from "./responses/error_handling.base.test.ts";
import { runErrorHandlingResourcesTests } from "./responses/error_handling.resources.test.ts";
import { runErrorHandlingContentIssuesTests } from "./responses/error_handling.content_issues.test.ts";
import { runErrorHandlingEdgeCasesTests } from "./responses/error_handling.edge_cases.test.ts";
import { runBatchedSearchTests } from "./transport_protocols/batched_search.test.ts";
import { runSearchParameterTypeTests } from "./parameters/search_parameter_types.test.ts";
import { runMatchingAndSubElementsTests } from "./parameters/matching_and_sub_elements.test.ts";
import { runSearchTestBasicsTests } from "./parameters/search_test_basics.test.ts";
import { runMatchingAndCardinalityTests } from "./parameters/matching_and_cardinality.test.ts";
import { runSearchingMultipleValuesTests } from "./parameters/earching_multiple_values.test.ts";
import { runJoiningMultipleValuesTests } from "./parameters/joining_multiple_values.test.ts";
import { runModifiersTests } from "./parameters/modifiers.test.ts";
import { runAboveModifierReferenceTests } from "./parameters/above/above_modifier_reference.test.ts";
import { runAboveModifierCanonicalTests } from "./parameters/above/above_modifier_canonical.test.ts";
import { runAboveModifierTokenTests } from "./parameters/above/above_modifier_token.test.ts";
import { runAboveModifierUriTests } from "./parameters/above/above_modifier_uri.test.ts";
import { runBelowModifierReferenceHierarchicalTests } from "./parameters/below/below_modifier_reference_hierarchical.test.ts";
import { runBelowModifierTokenTests } from "./parameters/below/below_modifier_token.test.ts";
import { runBelowModifierCanonicalTests } from "./parameters/below/below_modifier_canonical.test.ts";
import { runBelowModifierUriTests } from "./parameters/below/below_modifier_uri.test.ts";
import { runCodeTextModifierTests } from "./parameters/code_text_modifier.test.ts";
import { runContainsModifierTests } from "./parameters/contains_modifier.test.ts";
import { runExactModifierTests } from "./parameters/exact_modifier.test.ts";
import { runIdentifierModifierTests } from "./parameters/identifier_modifier.test.ts";
import { runIterateModifierTests } from "./parameters/iterate_modifier.test.ts";
import { runMissingModifierTests } from "./parameters/missing_modifier.test.ts";
import { runNotModifierTests } from "./parameters/not_modifier.test.ts";
import { runOfTypeModifierTests } from "./parameters/of_type_modifier.tests.ts";
import { runNotInModifierTests } from "./parameters/not_in_modifier.test.ts";
import { runTextModifierReferenceTokenTests } from "./parameters/text_modifier_reference_token.test.ts";
import { runTextModifierStringTests } from "./parameters/text_modifier_string.test.ts";
import { runTextAdvancedModifierTests } from "./parameters/text_advanced_modifier.test.ts";
import { runTypeModifierTests } from "./parameters/type_modifier.test.ts";
import { runPrefixTests } from "./prefixes/prefix_tests.ts";
import { runEscapingSearchParametersTests } from "./escaping/escaping_search_parameters.test.ts";
import { runDateParameterTests } from "./parameters/date_parameter.test.ts";
import { runSearchTypesFHIRTypesTests } from "./types/search_types_fhir_types.test.ts";
import { runNumberSearchTests } from "./parameters/number_search_tests.ts";
import { runQuantitySearchTests } from "./parameters/quantity_search.tests.ts";
import { runStringParameterTests } from "./parameters/string_parameter.test.ts";
import { runReferenceSearchTests } from "./parameters/reference_search.tests.ts";
import { runTokenParameterTests } from "./parameters/token_parameter.test.ts";
import { runUriParameterTests } from "./parameters/uri_parameter.test.ts";
import {
    runSpecialParameterTests,
} from "./parameters/special_parameters.test.ts";
import { runSearchingIdentifiersTests } from "./identifiers/searching_identifiers.test.ts";
import { runLogicalIdentifiersTests } from "./identifiers/logical_identifiers.test.ts";
import { runSearchingByMembershipTests } from "./identifiers/searching_by_membership.test.ts";
import { runIdentifiersAndReferencesTests } from "./identifiers/identifiers_and_references.test.ts";
import { runCanonicalIdentifiersTests } from "./identifiers/canonical_identifiers.test.ts";
import { runCanonicalIdentifiersAddonTests } from "./identifiers/canonical_identifiers_addon.test.ts";
import { runReferencesAndVersionsTests } from "./references/references_and_versions.test.ts";
import { runHierarchicalSearchTests } from "./conditions/hierarchical_search.test.ts";
import { runMimeTypeSearchTests } from "./conditions/mime_type_search.test.ts";
import { runChainedParametersTests } from "./conditions/chained_parameters.test.ts";
import { runReverseChainedParametersTests } from "./conditions/reverse_chaining.test.ts";
import { runHandlingMissingDataTests } from "./conditions/handling_missing_data.test.ts";
import { runAdvancedFilteringTests } from "./conditions/advanced_filtering.test.ts";
import { runSearchingMultipleResourceTypesTests } from "./conditions/multiple_resource_types.test.ts";
import { runImplicitResourcesTests } from "./conditions/implicit_resources.test.ts";
import { runNamedQueriesTests } from "./conditions/named_queries.test.ts";
import { runModifyingSearchResultsTests } from "./results/modifying_search_results.test.ts";
import { runTotalCountTests } from "./results/total_count.test.ts";
import { runSortingTests } from "./results/sorting.test.ts";
import { runPageSizeTests } from "./results/page_size.test.ts";
import { runMaxResultsTests } from "./results/max_results.test.ts";
import { runSummaryTests } from "./results/summary.test.ts";
import { runElementsTests } from "./results/elements.test.ts";
import { runRelevanceScoreTests } from "./results/relevance_score.test.ts";
import { runIncludeRevincludeTests } from "./include_references_resources/include_revinclude.test.ts";
import { runExternalReferencesTests } from "./references/external_references.test.ts";
import { runGraphDefinitionTests } from "./references/graph_definition.test.ts";
import { runContainedResourcesTests } from "./references/contained_resources.test.ts";
import { runPagingAndIncludesTests } from "./references/paging_and_includes.test.ts";
import { runStandardParametersTests } from "./standard_parameters/standard_parameters.test.ts";
import { runAllResourceParametersTests } from "./standard_parameters/all_resource_parameters.test.ts";
import { runContentParameterTests } from "./standard_parameters/content_parameter.test.ts";
import { runHasParameterTests } from "./standard_parameters/has_parameter.test.ts";
import { runIdParameterTests } from "./standard_parameters/id_parameter.test.ts";
import { runLanguageParameterTests } from "./standard_parameters/language_parameter.test.ts";
import { runLastUpdatedParameterTests } from "./standard_parameters/last_updated_parameter.test.ts";
import { runListParameterTests } from "./standard_parameters/list_parameter.test.ts";
import { runProfileParameterTests } from "./standard_parameters/profile_parameter.test.ts";
import { runQueryParameterTests } from "./standard_parameters/query_parameter.test.ts";
import { runSecurityParameterTests } from "./standard_parameters/security_parameter.test.ts";
import { runSourceParameterTests } from "./standard_parameters/source_parameter.test.ts";
import { runTagParameterTests } from "./standard_parameters/tag_parameter.test.ts";
import { runTextParameterTests } from "./standard_parameters/text_parameter.test.ts";
import { runTypeParameterTests } from "./standard_parameters/type_parameter.test.ts";
import { runResourceSpecificParameterTests } from "./resource_specific/resource_specific_parameters.test.ts";
import { runTextSearchParameterTests } from "./text_search/text_search_parameters.test.ts";
import { runServerConformanceTests } from "./conformance/server_conformance.test.ts";
import { runSearchResultCurrencyTests } from "./currency/search_result_currency.test.ts";
import { updateRandomText } from "../utils/resource_creators.ts";
import { createTestContext } from "../utils/testContext.ts";
import { runPagingMultipleWithIncludesTests } from "./references/paging_multiple_and_includes.ts";

export async function searchSuite(callback: () => void) {
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

    const exclude = false;

    if (!exclude) {
        describe("3.2.1.2.2 Search Inputs", () => {
            runSearchInputTests(testContext);
        });

        describe("3.2.1.2.3 Search Contexts", () => {
            runSearchContextTests(testContext);
        });

        describe("3.2.1.3.1 Bundle Type", () => {
            runBundleTypeTests(testContext);
        });

        describe("3.2.1.3.2 Self Link - Understanding a Performed Search", () => {
            runSelfLinkTests(testContext);
        });

        describe("3.2.1.3.3 Other Links - Paging", () => {
            runPagingLinksTests(testContext);
        });

        describe("3.2.1.3.4 Matches, Inclusions, and Outcomes - Bundle Entries", () => {
            runBundleEntriesTests(testContext);
        });
        describe("3.2.1.3.5 Handling Errors", () => {
            runErrorHandlingBaseTests(testContext);
            runErrorHandlingResourcesTests(testContext);
            runErrorHandlingContentIssuesTests(testContext);
            runErrorHandlingEdgeCasesTests(testContext);
        });
        describe("3.2.1.4.2 Batching Search Requests", () => {
            runBatchedSearchTests(testContext);
        });

        describe("3.2.1.5 Search Parameters", () => {
            runSearchParameterTypeTests(testContext);
        });

        describe("3.2.1.5.1 Search Test Basics", () => {
            runSearchTestBasicsTests(testContext);
        });

        describe("3.2.1.5.2 Matching and Cardinality", () => {
            runMatchingAndCardinalityTests(testContext);
        });

        describe("3.2.1.5.3 Matching and Sub-Elements", () => {
            runMatchingAndSubElementsTests(testContext);
        });
        describe("3.2.1.5.4 Searching Multiple Values", () => {
            runSearchingMultipleValuesTests(testContext);
            runJoiningMultipleValuesTests(testContext);
        });

        describe("3.2.1.5.5 Modifiers", () => {
            runModifiersTests(testContext);
        });
        describe("3.2.1.5.5.1.1 above with reference type search parameters", () => {
            runAboveModifierReferenceTests(testContext);
        });
        describe("3.2.1.5.5.1.2 above with canonical references", () => {
            runAboveModifierCanonicalTests(testContext);
        });
        describe("3.2.1.5.5.1.3 above with token type search parameters", () => {
            runAboveModifierTokenTests(testContext);
        });
        describe("3.2.1.5.5.1.4 above with uri type search parameters", () => {
            runAboveModifierUriTests(testContext);
        });

        describe("3.2.1.5.5.2.1 below with reference type search parameters - hierarchical searches", () => {
            runBelowModifierReferenceHierarchicalTests(testContext);
        });
        describe("3.2.1.5.5.2.2 below with canonical references", () => {
            runBelowModifierCanonicalTests(testContext);
        });
        describe("3.2.1.5.5.2.3 below with token type search parameters", () => {
            runBelowModifierTokenTests(testContext);
        });

        describe("3.2.1.5.5.2.4 below with uri type search parameters", () => {
            runBelowModifierUriTests(testContext);
        });
        describe("3.2.1.5.5.3 code-text modifier", () => {
            runCodeTextModifierTests(testContext);
        });
        describe("3.2.1.5.5.4 contains modifier", () => {
            runContainsModifierTests(testContext);
        });
        describe("3.2.1.5.5.5 exact modifier", () => {
            runExactModifierTests(testContext);
        });
        describe("3.2.1.5.5.6 identifier modifier", () => {
            runIdentifierModifierTests(testContext);
        });
        describe("3.2.1.5.5.8 iterate modifier", () => {
            runIterateModifierTests(testContext);
        });
        describe("3.2.1.5.5.9 missing modifier", () => {
            runMissingModifierTests(testContext);
        });
        describe("3.2.1.5.5.10 not modifier", () => {
            runNotModifierTests(testContext);
        });
        describe("3.2.1.5.5.11 not-in modifier", () => {
            runNotInModifierTests(testContext);
        });
        describe("3.2.1.5.5.12 of-type modifier", () => {
            runOfTypeModifierTests(testContext);
        });
        describe("3.2.1.5.5.13 text modifier with reference or token type search parameters", () => {
            runTextModifierReferenceTokenTests(testContext);
        });
        describe("3.2.1.5.5.14 text modifier with string type search parameters", () => {
            runTextModifierStringTests(testContext);
        });
        describe("3.2.1.5.5.15 text-advanced modifier", () => {
            runTextAdvancedModifierTests(testContext);
        });
        describe("3.2.1.5.5.16 [type] modifier", () => {
            runTypeModifierTests(testContext);
        });
        describe("3.2.1.5.6 Prefixes", () => {
            runPrefixTests(testContext);
        });
        // ---
        describe("3.2.1.5.7 Escaping Search Parameters", () => {
            runEscapingSearchParametersTests(testContext);
        });
        describe("3.2.1.5.8 Search Types and FHIR Types", () => {
            runSearchTypesFHIRTypesTests(testContext);
        });
        describe("3.2.1.5.9 Date Parameter", () => {
            runDateParameterTests(testContext);
        });
        describe("3.2.1.5.10 Number Search Parameter", () => {
            runNumberSearchTests(testContext);
        });
        describe("3.2.1.5.11 Quantity Search Parameter", () => {
            runQuantitySearchTests(testContext);
        });
        describe("3.2.1.5.12 Reference Search Parameter", () => {
            runReferenceSearchTests(testContext);
        });
        describe("3.2.1.5.13 String Parameter", () => {
            runStringParameterTests(testContext);
        });
        describe("3.2.1.5.14 Token Parameter", () => {
            runTokenParameterTests(testContext);
        });
        describe("3.2.1.5.15 URI Parameter", () => {
            runUriParameterTests(testContext);
        });
        describe("3.2.1.5.16 Special Parameters", () => {
            runSpecialParameterTests(testContext);
        });
        describe("3.2.1.6.1 Searching Identifiers", () => {
            runSearchingIdentifiersTests(testContext);
        });
        describe("3.2.1.6.1.1 Logical Identifiers", () => {
            runLogicalIdentifiersTests(testContext);
        });
        describe("3.2.1.6.1.2 Searching by Membership", () => {
            runSearchingByMembershipTests(testContext);
        });
        describe("3.2.1.6.1.3 Identifiers and References", () => {
            runIdentifiersAndReferencesTests(testContext);
        });
        describe("3.2.1.6.1.4 Canonical Identifiers", () => {
            runCanonicalIdentifiersTests(testContext);
        });
        describe("3.2.1.6.1.5 Canonical Identifiers", () => {
            runCanonicalIdentifiersAddonTests(testContext);
        });
        describe("3.2.1.6.2 References and Versions", () => {
            runReferencesAndVersionsTests(testContext);
        });
        describe("3.2.1.6.3 Searching Hierarchies", () => {
            runHierarchicalSearchTests(testContext);
        });
        describe("3.2.1.6.4 Searching MIME Types", () => {
            runMimeTypeSearchTests(testContext);
        });
        describe("3.2.1.6.5 Chaining (chained parameters)", () => {
            runChainedParametersTests(testContext);
        });
        describe("3.2.1.6.6 Reverse Chaining", () => {
            runReverseChainedParametersTests(testContext);
        });
        describe("3.2.1.6.7 Handling Missing Data", () => {
            runHandlingMissingDataTests(testContext);
        });
        describe("3.2.1.6.8 Advanced filtering", () => {
            runAdvancedFilteringTests(testContext);
        });
        describe("3.2.1.6.9 Searching Multiple Resource Types", () => {
            runSearchingMultipleResourceTypesTests(testContext);
        });
        describe("3.2.1.6.10 Implicit Resources", () => {
            runImplicitResourcesTests(testContext);
        });
        describe("3.2.1.6.11 Named Queries", () => {
            runNamedQueriesTests(testContext);
        });
        describe("3.2.1.7 Modifying Search Results", () => {
            runModifyingSearchResultsTests(testContext);
        });
        describe("3.2.1.7.1 Sorting (_sort)", () => {
            runSortingTests(testContext);
        });
        describe("3.2.1.7.2 Total number of matching resources (_total)", () => {
            runTotalCountTests(testContext);
        });
        describe("3.2.1.7.3 Limiting Page Size (_count)", () => {
            runPageSizeTests(testContext);
        });
        describe("3.2.1.7.4 Limiting Total Result Size (_maxresults)", () => {
            runMaxResultsTests(testContext);
        });
        describe("3.2.1.7.5 Summary (_summary)", () => {
            runSummaryTests(testContext);
        });
        describe("3.2.1.7.6 Elements (_elements)", () => {
            runElementsTests(testContext);
        });
        describe("3.2.1.7.7 Relevance (_score)", () => {
            runRelevanceScoreTests(testContext);
        });
        describe("3.2.1.7.8.1 Inline Requests (_include and _revinclude)", () => {
            runIncludeRevincludeTests(testContext);
        });
        describe("3.2.1.7.8.2 External References", () => {
            runExternalReferencesTests(testContext);
        });
        describe("3.2.1.7.8.3 Graph Definitions (_graph)", () => {
            runGraphDefinitionTests(testContext);
        });
        describe("3.2.1.7.8.4 Contained Resources (_contained)", () => {
            runContainedResourcesTests(testContext);
        });
        describe("3.2.1.7.8.5 Paging and Other Resources", () => {
            runPagingAndIncludesTests(testContext);
            runPagingMultipleWithIncludesTests(testContext);
        });
        describe("3.2.1.8 Standard Parameters", () => {
            runStandardParametersTests(testContext);
        });
        describe("3.2.1.8.1 Parameters for all resources", () => {
            runAllResourceParametersTests(testContext);
        });
        describe("3.2.1.8.1.1 _content", () => {
            runContentParameterTests(testContext);
        });
        describe("3.2.1.8.1.2 _has", () => {
            runHasParameterTests(testContext);
        });
        describe("3.2.1.8.1.3 _id", () => {
            runIdParameterTests(testContext);
        });
        describe("3.2.1.8.1.5 _language", () => {
            runLanguageParameterTests(testContext);
        });
        describe("3.2.1.8.1.6 _lastUpdated", () => {
            runLastUpdatedParameterTests(testContext);
        });
        describe("3.2.1.8.1.7 _list", () => {
            runListParameterTests(testContext);
        });
        describe("3.2.1.8.1.8 _profile", () => {
            runProfileParameterTests(testContext);
        });
        describe("3.2.1.8.1.9 _query", () => {
            runQueryParameterTests(testContext);
        });
        describe("3.2.1.8.1.10 _security", () => {
            runSecurityParameterTests(testContext);
        });
        describe("3.2.1.8.1.11 _source", () => {
            runSourceParameterTests(testContext);
        });
        describe("3.2.1.8.1.12 _tag", () => {
            runTagParameterTests(testContext);
        });
        describe("3.2.1.8.1.13 _text", () => {
            runTextParameterTests(testContext);
        });
        describe("3.2.1.8.1.14 _type", () => {
            runTypeParameterTests(testContext);
        });
        describe("3.2.1.8.2 Parameters for each resource", () => {
            runResourceSpecificParameterTests(testContext);
        });
        describe("3.2.1.8.3 Text Search Parameters", () => {
            runTextSearchParameterTests(testContext);
        });
        describe("3.2.1.9 Server Conformance", () => {
            runServerConformanceTests(testContext);
        });
        describe("3.2.1.10 Search Result Currency", () => {
            runSearchResultCurrencyTests(testContext);
        });
    }
}
