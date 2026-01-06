/*
A centralized HTTP utility that handles environment-specific base URLs, authentication headers, and consistent error handling.

It has ONE job:

take a URL

optionally take a JWT

make a request

either return JSON or throw an error
*/

const DEFAULT_DEV_API_URL = "http://localhost:3005";
const DEFAULT_PROD_API_URL = "";

function resolveApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL;
  const url = envUrl && envUrl.trim().length > 0 ? envUrl : import.meta.env.PROD ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL;
  return url.replace(/\/$/, "");
}

const API_BASE_URL = import.meta.env.PROD ? DEFAULT_PROD_API_URL : DEFAULT_DEV_API_URL;
// const API_BASE_URL = resolveApiBaseUrl();

type FetchOptions = RequestInit & { token?: string };

function resolveUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
}

export async function fetchJson<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { token, headers, ...init } = options;

  const response = await fetch(resolveUrl(path), {
    ...init,
    headers: {
      ...headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("Content-Type") ?? "";

    if (contentType.includes("application/json")) {
      const body = await response.json().catch(() => null);
      if (body && typeof body === "object" && "error" in body && typeof (body as { error?: unknown }).error === "string") {
        throw new Error((body as { error: string }).error);
      }
    }

    const text = await response.text().catch(() => "");
    throw new Error(text || `HTTP ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
