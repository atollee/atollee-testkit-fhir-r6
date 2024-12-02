import { isBun } from "https://deno.land/x/oak@14.2.0/util.ts";
import { CONFIG } from "../config.ts";
import { ITestContext } from "../types.ts";

export function createTestContext(
    accessToken: string | undefined,
): ITestContext {
    return {
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
        isPreferHeaderReturned: () => CONFIG.preferHeaderReturned ?? true,
        isBundleTotalMandatory: () => CONFIG.bundleTotalMandatory ?? true,
        isTextContentSearchSupported: () =>
            CONFIG.textContentSearchSupported ?? true,
        isMultiTypeSearchSupported: () => CONFIG.multiTypeSupported ?? true,
        isLenientSearchHandlingSupported: () =>
            CONFIG.lenientSearchHandlingSupported ?? true,
        areEmptyParametersAllowed: () => CONFIG.emptyParametersAllowed ?? true,
        isPaginationFirstRelationLinkSupported: () =>
            CONFIG.paginationFirstRelationLinkSupported ?? true,
        isPaginationNextRelationLinkSupported: () =>
            CONFIG.paginationNextRelationLinkSupported ?? true,
        enforceMultipleModifiersDisallowed: () =>
            CONFIG.enforceDisallowingMultipleModifiers ?? true,
        isLocationAboveModifierSupported: () =>
            CONFIG.locationAboveModifierSupported ?? true,
        isCanonicalUrlAboveModifierSupported: () =>
            CONFIG.canonicalUrlAboveModifierSupported ?? true,
        isSemverVersionComparisonSupported: () =>
            CONFIG.semverVersionComparisonSupported ?? true,
        isHapiBugsDisallowed: () => CONFIG.hapiBugsDisallowed ?? true,
        isAboveModifierOnSnomedCodeSystemsSupported: () =>
            CONFIG.aboveModifierOnSnomedCodeSystemsSupported ?? true,
        isLocationBelowModifierSupported: () =>
            CONFIG.locationBelowModifierSupported ?? true,
        isBelowModifierOnSnomedCodeSystemsSupported: () =>
            CONFIG.belowModifierOnSnomedCodeSystemsSupported ?? true,
        isCanonicalUrlBelowModifierSupported: () =>
            CONFIG.canonicalUrlBelowModifierSupported ?? true,
        isBelowModifierOnMimeTypesSupported: () =>
            CONFIG.belowModifierOnMimeTypesSupported ?? true,
        isIdentifierCanonicalSearchSupported: () =>
            CONFIG.identifierCanonicalSearchSupported ?? true,
        isIdentifierReferenceSearchSupported: () =>
            CONFIG.identifierReferenceSearchSupported ?? true,
        isNotInModifierSnomedSystemSupported: () =>
            CONFIG.notInModifierSnomedSystemSupported ?? true,
        isOfTypeModifierSupported: () => CONFIG.ofTypeModifierSupported ?? true,
        isFullTextSearchSupported: () => CONFIG.fullTextSearchSupported ?? true,
        areExternalReferencesAllowed: () =>
            CONFIG.externalReferencesAllowed ?? true,
        isApproximateSearchSupported: () =>
            CONFIG.approximateSearchSupported ?? true,
        getApproximitySearchRange: () => CONFIG.approximitySearchRange ?? 10,
        isLocationContainsParameterSupported: () =>
            CONFIG.locationContainsParameterSupported ?? true,
        isLocationNearParameterSupported: () =>
            CONFIG.locationNearParameterSupported ?? true,
        isCompositionSectionTextParameterSupported: () =>
            CONFIG.compositionSectionTextParameterSupported ?? true,
        isRejectSearchWithAmbiguousResourceTypesSupported: () =>
            CONFIG.rejectSearchWithAmbiguousResourceTypesSupported ?? true,
        isHasForChainedSearchesSupported: () =>
            CONFIG.hasForChainedSearchesSupported ?? true,
        isFilterContainsOperatorSupported: () =>
            CONFIG.filterContainsOperatorSupported ?? true,
        isMultipleResourceTypeSearchSupported: () =>
            CONFIG.multipleResourceTypeSearchSupported ?? true,
        isImplicitCodeSystemSearchSupported: () =>
            CONFIG.implicitCodeSystemSearchSupported ?? true,
        isExpandOperationSupported: () =>
            CONFIG.expandOperationSupported ?? true,
        isSummarySearchParameterSupported: () =>
            CONFIG.summarySearchParameterSupported ?? true,
        isElementSearchParameterSupported: () =>
            CONFIG.elementSearchParameterSupported ?? true,
        isMaxResultsSearchParameterSupported: () =>
            CONFIG.maxResultsSearchParameterSupported ?? true,
        isRelevantSortSupported: () => CONFIG.relevantSortSupported ?? true,
        isGraphSearchParameterSupported: () =>
            CONFIG.graphSearchParameterSupported ?? true,
        isContainedSearchesSupported: () =>
            CONFIG.containedSearchesSupported ?? true,
        isLanguageSearchParameterSupported: () =>
            CONFIG.languageSearchParameterSupported ?? true,
        isQuerySearchParameterSupported: () =>
            CONFIG.querySearchParameterSupported ?? true,
        isSourceSearchParameterSupported: () =>
            CONFIG.sourceSearchParameterSupported ?? true,
        isNamedListSearchParameterSupported: () =>
            CONFIG.namedListSearchParameterSupported ?? true,
        isIgnoringUnknownParameters: () =>
            CONFIG.ignoringUnknownParameters ?? true,
        getServerTimezone: () => CONFIG.serverTimeZone,
        isAbsoluteUrlReferencesSupported: () =>
            CONFIG.absoluteUrlReferencesSupported ?? true,
        isIdentifierModifierSupported: () =>
            CONFIG.identifierModifierSupported ?? true,
        isSearchParameterCaseInsensitiveSupported: () =>
            CONFIG.searchParameterCaseInsensitiveSupported ?? true,
        createRelativeUrl: (url: string): string => {
            const baseUrl = CONFIG.fhirServerUrl;
            let newUrl = url;
            if (newUrl.startsWith(baseUrl)) {
                newUrl = newUrl.substring(baseUrl.length);
            }
            if (newUrl.startsWith("/")) {
                newUrl = newUrl.substring(1);
            }
            return newUrl;
        },
        areTransactionSupported: () => CONFIG.transactionSupported ?? true,
    };
}
