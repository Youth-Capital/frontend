import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from "axios";

import i18n from "@/shared/i18n";
import type { ApiError } from "@/shared/types/api";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";

/**
 * The access token lives here, in memory only.
 *
 * Not localStorage: anything readable by JavaScript is readable by an XSS
 * payload. The refresh token is an httpOnly cookie the browser handles for us,
 * so a page reload recovers the session through /auth/refresh/ without ever
 * exposing a long-lived credential to script.
 */
let accessToken: string | null = null;
let onSessionExpired: (() => void) | null = null;

export const setAccessToken = (token: string | null): void => {
  accessToken = token;
};

export const getAccessToken = (): string | null => accessToken;

export const setSessionExpiredHandler = (handler: () => void): void => {
  onSessionExpired = handler;
};

export const api: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send the refresh cookie
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  // A file upload must not inherit the instance's JSON content type.
  //
  // Every request here defaults to application/json, which is right for all
  // but one case: a multipart body needs a boundary, and only the browser can
  // generate it — and it will not, while a Content-Type is already set. The
  // upload then arrives as a JSON body the server cannot parse. Deleting the
  // header lets the browser fill it in, boundary and all.
  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  // Taken from i18next, not localStorage: on the very first render the cache
  // key does not exist yet, so the header was omitted and the server fell back
  // to its default language — which is how a Russian UI ended up rendering
  // Uzbek taxonomy labels.
  const language = i18n.resolvedLanguage ?? i18n.language;
  if (language) {
    config.headers["Accept-Language"] = language;
  }
  return config;
});

/*
 * Refresh coordination.
 *
 * Several requests can 401 at the same moment (a dashboard fires six queries
 * at once). Without this queue each one would call /auth/refresh/ separately,
 * and because refresh tokens rotate, the second call would present an
 * already-blacklisted token and log the user out. So: the first 401 refreshes,
 * everyone else waits for that single result.
 */
let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = async (): Promise<string> => {
  const response = await axios.post<{ access: string }>(
    `${BASE_URL}/auth/refresh/`,
    {},
    { withCredentials: true },
  );
  return response.data.access;
};

/**
 * Did the refresh say the session is over, or just that it could not answer?
 *
 * Only the first is a reason to sign someone out. A rate limit, a dropped
 * connection or a server error mean "not now" — treating them as "you are
 * logged out" threw people back to the sign-in page for reloading a few times
 * in a row, because every page load spends one refresh.
 */
const sessionIsOver = (error: unknown): boolean => {
  if (!axios.isAxiosError(error)) return false;
  const status = error.response?.status;
  if (status === 401) return true;
  // No cookie at all: there was nothing to keep.
  const code = (error.response?.data as ApiError | undefined)?.error?.code;
  return status === 400 && code === "no_refresh_token";
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiError>) => {
    const original = error.config as RetriableConfig | undefined;
    const status = error.response?.status;

    const isAuthEndpoint =
      original?.url?.includes("/auth/login/") ||
      original?.url?.includes("/auth/refresh/") ||
      original?.url?.includes("/auth/register/");

    if (status === 401 && original && !original._retried && !isAuthEndpoint) {
      original._retried = true;
      try {
        refreshPromise ??= refreshAccessToken().finally(() => {
          refreshPromise = null;
        });
        const token = await refreshPromise;
        setAccessToken(token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch (refreshError) {
        if (sessionIsOver(refreshError)) {
          setAccessToken(null);
          onSessionExpired?.();
        }
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  },
);

/**
 * The HTTP status behind a failure, when there was a response at all.
 *
 * A page usually needs this to say something useful: 403 on a candidate list
 * means "this vacancy belongs to another company" and retrying will never
 * help, while 502 means "try again". Without it every failure collapses into
 * one generic sentence.
 */
export const httpStatus = (error: unknown): number | undefined =>
  axios.isAxiosError(error) ? error.response?.status : undefined;

/** Normalise any failure into the backend's error envelope. */
export const toApiError = (error: unknown): ApiError["error"] => {
  if (axios.isAxiosError(error)) {
    const payload = (error.response?.data as ApiError | undefined)?.error;
    if (payload) return payload;
    if (!error.response) {
      return {
        code: "network_error",
        message: "Network request failed.",
        details: {},
      };
    }
  }
  return { code: "unknown_error", message: "Something went wrong.", details: {} };
};
