import axios from "axios";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthSession,
  persistAuthSession,
  getStoredUser,
} from "./utils/auth";

const AUTH_FREE_PATHS = new Set(["auth/login/", "auth/refresh/"]);

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || "/api";
export const API_BASE_URL = `${rawApiBaseUrl.replace(/\/+$/, "")}/`;


export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request: attach access token ─────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const requestPath = config.url ?? "";

  if (AUTH_FREE_PATHS.has(requestPath)) {
    delete config.headers?.Authorization;
    return config;
  }

  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response: auto-refresh on 401 ────────────────────────────────────────────
let refreshPromise: Promise<string> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status !== 401 || originalRequest?._retry) {
      return Promise.reject(error);
    }

    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refresh) {
      clearAuthSession();
      if (window.location.pathname !== "/") window.location.href = "/";
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = axios
        .post(`${API_BASE_URL}auth/refresh/`, { refresh })
        .then((res) => {
          const user = getStoredUser();
          persistAuthSession({ access: res.data.access, refresh, user });
          return res.data.access as string;
        })
        .catch((refreshErr) => {
          clearAuthSession();
          if (window.location.pathname !== "/") window.location.href = "/";
          throw refreshErr;
        })
        .finally(() => {
          refreshPromise = null;
        });
    }

    const newAccess = await refreshPromise;
    originalRequest.headers.Authorization = `Bearer ${newAccess}`;
    return api(originalRequest);
  },
);

export default api;

