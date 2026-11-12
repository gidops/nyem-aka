// The one place in the web app that calls `fetch`. Everything else goes through
// `api()` (JSON) or `apiBlob()` (file downloads).

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  // A plain object is sent as JSON; a FormData is sent as a multipart upload.
  body?: unknown;
}

// If several requests fail with 401 at once, they share a single refresh call
// instead of each sending their own (the first would rotate the token and the
// rest would then fail).
let refreshInFlight: Promise<boolean> | null = null;

function refreshSession(): Promise<boolean> {
  refreshInFlight ??= fetch("/api/auth/refresh", {
    method: "POST",
    credentials: "include",
  })
    .then((response) => response.ok)
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

function send(path: string, options: ApiOptions): Promise<Response> {
  const isUpload = options.body instanceof FormData;
  return fetch(`/api${path}`, {
    method: options.method ?? "GET",
    // Tells the browser to attach the httpOnly cookies. We never touch the tokens ourselves.
    credentials: "include",
    // For uploads the browser must set Content-Type itself (it adds the multipart boundary).
    headers:
      options.body === undefined || isUpload
        ? undefined
        : { "Content-Type": "application/json" },
    body:
      options.body === undefined
        ? undefined
        : isUpload
          ? (options.body as FormData)
          : JSON.stringify(options.body),
  });
}

// NestJS errors look like { message: string | string[], error, statusCode }.
async function errorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();
    const message = (data as { message?: unknown }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string") return message;
  } catch {
    // Not JSON (for example the API is down and the proxy returned HTML).
  }
  if (response.status === 413) return "That file is too large (5 MB maximum)";
  if (response.status === 429) return "Too many attempts. Wait a minute and try again.";
  if (response.status >= 500) return "The server is not responding. Try again shortly.";
  return `Request failed (${response.status})`;
}

async function request(path: string, options: ApiOptions): Promise<Response> {
  let response: Response;
  try {
    response = await send(path, options);
    // An expired access token gives 401. Try one silent refresh, then repeat the request.
    // Auth routes are excluded: a 401 from /auth/login means wrong password, not expiry.
    if (response.status === 401 && !path.startsWith("/auth/")) {
      if (await refreshSession()) response = await send(path, options);
    }
  } catch {
    throw new ApiError(0, "Could not reach the server. Check your connection.");
  }
  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  return response;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  return (await (await request(path, options)).json()) as T;
}

// Downloads a file through the same authenticated path and hands it to the browser.
// A plain <a href> would work until the access token expired; this refreshes first.
export async function apiDownload(path: string, fallbackName: string): Promise<void> {
  const response = await request(path, {});
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const fileName = /filename="([^"]+)"/.exec(disposition)?.[1] ?? fallbackName;

  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

// Builds "?a=1&b=2" from an object, leaving out empty values.
export function toQuery(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}

export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}
