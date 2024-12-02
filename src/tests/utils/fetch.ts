import { CONFIG } from "../config.ts";
import { IFetchOptions, IFetchResponse, ITestContext } from "../types.ts";
import { recordHttpInteraction } from "./bdd/mod.ts";
import { HttpRequest } from "./bdd/types.ts";
import { createTestIdentifierString } from "./creators/utils.ts";
import { extractErrorMessage } from "./error.ts";
import { getAccessToken } from "./oauth.ts";

export async function fetchWrapper(
    options: IFetchOptions,
): Promise<IFetchResponse> {
    const {
        authorized = false,
        method = "GET",
        relativeUrl,
        headers: customHeaders = {},
        body,
        ...otherOptions
    } = options;

    let relativeTargetUrl = relativeUrl;
    let logLevel: string | undefined = undefined;

    if (CONFIG.traceFetchCalls) {
        logLevel = "trace";
    } else if (CONFIG.debugFetchCalls) {
        logLevel = "debug";
    }
    if (logLevel) {
        if (relativeTargetUrl.indexOf("?") !== -1) {
            relativeTargetUrl += "&_loglevel=" + logLevel;
        } else {
            relativeTargetUrl += "?_loglevel=" + logLevel;
        }
    }
    const baseUrl = options.overrideBaseUrl || CONFIG.fhirServerUrl;
    const fhirServerUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const url = new URL(relativeTargetUrl, fhirServerUrl).toString();

    const headers = new Headers(customHeaders);
    if (!headers.has("Content-Type")) {
        headers.set("Content-Type", "application/json");
    }
    if (authorized) {
        const accessToken = await getAccessToken();
        headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const request: HttpRequest = {
        method,
        url,
        headers: Object.fromEntries(headers.entries()),
        body: body,
    };

    let response: Response | undefined = undefined;
    try {
        response = await fetch(url, {
            method,
            headers,
            body,
            ...otherOptions,
        });

        const rawBody = await response.text();
        let jsonBody;
        let jsonParsed = false;

        try {
            jsonBody = JSON.parse(rawBody);
            jsonParsed = true;
        } catch (_error) {
            // JSON parsing failed, leave jsonBody undefined
        }

        const responseData = {
            success: response.ok,
            jsonParsed,
            status: response.status,
            headers: response.headers,
            jsonBody,
            rawBody,
        };

        // Record the HTTP interaction
        recordHttpInteraction(request, {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries()),
            body: rawBody,
        });

        const failure = CONFIG.recordFetchFailures &&
            responseData.status >= 400;
        if (CONFIG.showFetchResponses || failure) {
            console.log(`${method} ${url}... ${responseData.status}`);
        }
        if (failure) {
            // Check if the response contains an OperationOutcome
            if (
                responseData.jsonParsed && responseData.jsonBody &&
                // deno-lint-ignore no-explicit-any
                (responseData.jsonBody as any).resourceType ===
                    "OperationOutcome"
            ) {
                console.error("OperationOutcome:");
                console.error(JSON.stringify(responseData.jsonBody, null, 2));
            } else {
                console.error("Response body:");
                console.error(responseData.rawBody);
            }
        }
        return responseData;
    } catch (error) {
        const errorResponse = {
            success: false,
            error,
            status: response?.status || -1,
            jsonParsed: false,
            headers: new Headers(),
            jsonBody: null,
            rawBody: extractErrorMessage(error),
        };

        // Record the HTTP interaction with error
        recordHttpInteraction(request, {
            status: errorResponse.status,
            statusText: "Error",
            headers: {},
            body: extractErrorMessage(error),
        });

        if (CONFIG.showFetchResponses) {
            console.log(`${method} ${url}... ${errorResponse.status}`);
        }
        if (CONFIG.recordFetchFailures && errorResponse.status >= 400) {
            // Check if the response contains an OperationOutcome
            if (
                errorResponse.jsonParsed && errorResponse.jsonBody &&
                // deno-lint-ignore no-explicit-any
                (errorResponse.jsonBody as any).resourceType ===
                    "OperationOutcome"
            ) {
                console.error("OperationOutcome:");
                console.error(JSON.stringify(errorResponse.jsonBody, null, 2));
            } else {
                console.error("Response body:");
                console.error(errorResponse.rawBody);
            }
        }
        return errorResponse;
    }
}

export async function fetchSearchWrapper(
    options: IFetchOptions,
): Promise<IFetchResponse> {
    const { relativeUrl, ...restOptions } = options;

    // Get the current test identifier
    const identifier = createTestIdentifierString();

    // Construct the new relative URL with the identifier parameter
    const urlObj = new URL(relativeUrl, "http://dummy-base-url.com");
    urlObj.searchParams.append("identifier", identifier);
    let newRelativeUrl = urlObj.pathname + urlObj.search;

    if (!relativeUrl.startsWith("/") && newRelativeUrl.startsWith("/")) {
        newRelativeUrl = newRelativeUrl.substring(1);
    }
    // Call the original fetchWrapper with the updated relative URL
    return await fetchWrapper({
        ...restOptions,
        relativeUrl: newRelativeUrl,
    });
}

export function patchUrl(context: ITestContext, url: string): string {
    const baseUrl = context.getBaseUrl();
    let nextLinkUrl = url.replace(baseUrl, "");
    if (nextLinkUrl.startsWith("/")) {
        nextLinkUrl = nextLinkUrl.substring(1);
    }
    return nextLinkUrl;
}
