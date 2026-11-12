// The one place in the web app that calls `fetch`. Everything else goes through `api()`.

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
  return fetch(`/api${path}`, {
    method: options.method ?? "GET",
    // Tells the browser to attach the httpOnly cookies. We never touch the tokens ourselves.
    credentials: "include",
    headers:
      options.body === undefined
        ? undefined
        : { "Content-Type": "application/json" },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
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
  return `Request failed (${response.status})`;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  let response = await send(path, options);

  // An expired access token gives 401. Try one silent refresh, then repeat the request.
  // Auth routes are excluded: a 401 from /auth/login means wrong password, not expiry.
  if (response.status === 401 && !path.startsWith("/auth/")) {
    if (await refreshSession()) {
      response = await send(path, options);
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await errorMessage(response));
  }
  return (await response.json()) as T;
}
