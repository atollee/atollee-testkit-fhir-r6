import { Application, Router } from "https://deno.land/x/oak@14.2.0/mod.ts";

let app: Application | null = null;
let codePromise: Promise<string> | null = null;
let abortController: AbortController | null = null;
let serverPromise: Promise<void> | null = null;

let code: string | null = null;

// deno-lint-ignore require-await
export async function startLocalServer(): Promise<void> {
    if (app) {
        console.log("Server is already running");
        return;
    }

    app = new Application();
    const router = new Router();

    codePromise = new Promise((resolve) => {
        router.get("/callback", (context) => {
            code = context.request.url.searchParams.get("code");
            if (code) {
                context.response.body =
                    "Authorization successful! You can close this window.";
                resolve(code);
            } else {
                context.response.body =
                    "Authorization failed. No code received.";
            }
        });
    });

    app.use(router.routes());
    app.use(router.allowedMethods());

    abortController = new AbortController();
    const signal = abortController.signal;

    serverPromise = app.listen({ port: 3000, signal });
    console.log("Local server started on http://localhost:3000");
}

export async function waitForAuthCode(): Promise<string> {
    if (code !== null) {
        return code;
    }
    if (!app || !codePromise) {
        throw new Error("Server not started. Call startLocalServer() first.");
    }

    return await codePromise;
}

// Function to stop the server (optional, but good for cleanup)
// deno-lint-ignore require-await
export async function stopLocalServer() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    if (serverPromise) {
        // await serverPromise;
        serverPromise = null;
    }
    app = null;
    codePromise = null;
    console.log("Local server stopped");
}
