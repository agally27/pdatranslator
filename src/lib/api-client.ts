/** Small fetch wrapper for the app's own API routes. Always resolves to a friendly error message on failure. */
export class ApiClientError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = "ApiClientError";
  }
}

async function handle<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T;
  let code = "error";
  let message = "Something went wrong. Please try again.";
  try {
    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    if (body.error?.message) message = body.error.message;
    if (body.error?.code) code = body.error.code;
  } catch {
    /* non-JSON error */
  }
  throw new ApiClientError(response.status, code, message);
}

export async function postJson<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ApiClientError(0, "network", "We couldn’t reach the server. Please check your connection and try again.");
  }
  return handle<T>(response);
}

export async function postForm<T>(url: string, form: FormData): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { method: "POST", body: form });
  } catch {
    throw new ApiClientError(0, "network", "We couldn’t reach the server. Please check your connection and try again.");
  }
  return handle<T>(response);
}

export function errorMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.";
}
