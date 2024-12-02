import puppeteer from "https://deno.land/x/puppeteer_plus@0.24.0/mod.ts";
import {encodeBase64} from "https://deno.land/std/encoding/base64.ts";
import {CONFIG} from "../config.ts";
import {startLocalServer, stopLocalServer, waitForAuthCode} from "./localServer.ts";

// deno-lint-ignore require-await
async function getSmartAuthorizationUrl(): Promise<string> {
    const params = new URLSearchParams({
        response_type: "code",
        client_id: CONFIG.clientId,
        redirect_uri: CONFIG.redirectUri,
        scope: CONFIG.scope,
        state: crypto.randomUUID(),
        aud: CONFIG.fhirServerUrl,
    });

    return `${CONFIG.authServerUrl}/authorize?${params.toString()}`;
}

async function exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch(`${CONFIG.authServerUrl}/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": 'Basic ' + encodeBase64(`${CONFIG.clientId}:${CONFIG.clientSecret}`)
        },
        body: new URLSearchParams({
            grant_type: "authorization_code",
            code: code,
            redirect_uri: CONFIG.redirectUri,
            client_id: CONFIG.clientId,
        }),
    });

    const data = await response.json();
    return data.access_token;
}

let accessToken: string | undefined = undefined;

export const getAccessToken = async () => {

    if (accessToken) {
        return accessToken;
    }
    if (!CONFIG.authorized) {
        return '';
    }
    // Step 1: Get the authorization URL
    const authUrl = await getSmartAuthorizationUrl();

    // Start the server
    await startLocalServer();

    // Step 3: Open the browser for user authentication
    await openUrl(authUrl, CONFIG.userName, CONFIG.password);

    let authCode: string | undefined = undefined;
    try {
        authCode = await waitForAuthCode();
        console.log("Received auth code:", authCode);
        // Use the authCode for token exchange
    } catch (error) {
        console.error("Error waiting for auth code:", error);
    } finally {
        // Stop the server when you're done
        await stopLocalServer();
    }

    if (!authCode) {
        throw new Error('no auth code could be fetched');
    }
    // Step 5: Exchange the code for an access token
    accessToken = await exchangeCodeForToken(authCode);

    await closeUrl();
    return accessToken;
};

let browser: puppeteer.Browser | undefined = undefined;

export async function openUrl(url: string, oauthUserName: string, oauthPassword: string): Promise<void> {
    if (!browser) {
        browser = await puppeteer.launch({
            headless: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }
    await new Promise((resolve) => setTimeout(resolve, 0));
    const page = await browser.newPage();
    await page.goto(url);

    await page.waitForSelector('div.login-pf-page');

    // Type the username in the focused field
    await page.keyboard.type(oauthUserName);

    // Press Tab to move to the next field
    await page.keyboard.press('Tab');

    // Type the password in the password field
    await page.keyboard.type(oauthPassword);

    // Press Tab to move to the submit button
    await page.keyboard.press('Tab');

    // Press Enter to submit the form
    await page.keyboard.press('Enter');

    // Wait for navigation to complete after form submission
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    await page.close();
    await browser.close();
    browser = undefined;
}

export async function closeUrl(): Promise<void> {
    if (browser) {
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close()));

        console.log(`browser closed`);
        browser = undefined;
    }
}
