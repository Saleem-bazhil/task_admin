import axios from "axios";
import { clearAuthSession } from "./utils/auth";

const AUTH_FREE_PATHS = new Set([
  "auth/login/",
  "auth/refresh/",
]);

// Create an Axios instance with base URL
export const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/",
  headers: {
    "Content-Type": "application/json",
  },
});

// Add a request interceptor to attach the auth token
api.interceptors.request.use(
  (config) => {
    const requestPath = config.url ?? "";

    if (AUTH_FREE_PATHS.has(requestPath)) {
      if (config.headers?.Authorization) {
        delete config.headers.Authorization;
      }
      return config;
    }

    // Attempt to get token from localStorage. Can adjust the key based on how it's saved (e.g. "access" or "token")
    const token = localStorage.getItem("access") || localStorage.getItem("token") || localStorage.getItem("accessToken");
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = new axios.AxiosHeaders({
          Authorization: `Bearer ${token}`,
        });
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      clearAuthSession();
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
