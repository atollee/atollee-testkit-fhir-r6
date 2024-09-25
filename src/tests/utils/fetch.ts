import { CONFIG } from "../config.ts";
import { IFetchOptions, IFetchResponse } from "../types.ts";
import { recordHttpInteraction } from "./bdd/mod.ts";
import { HttpRequest } from "./bdd/types.ts";
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

    const baseUrl = options.overrideBaseUrl || CONFIG.fhirServerUrl;
    const fhirServerUrl = baseUrl.endsWith("/") ? baseUrl : baseUrl + "/";
    const url = new URL(relativeUrl, fhirServerUrl).toString();

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

        return responseData;
    } catch (error) {
        const errorResponse = {
            success: false,
            error,
            status: response?.status || -1,
            jsonParsed: false,
            headers: new Headers(),
            jsonBody: null,
            rawBody: error.message,
        };

        // Record the HTTP interaction with error
        recordHttpInteraction(request, {
            status: errorResponse.status,
            statusText: "Error",
            headers: {},
            body: error.message,
        });

        return errorResponse;
    }
}
