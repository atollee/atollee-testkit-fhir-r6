export function extractErrorMessage(error: unknown): string {
    if (typeof error === "string") {
        return error;
    } else if (error instanceof Error) {
        return error.message;
    } else {
        return String(error);
    }
}
