/**
 * Cliente HTTP SafeWork AI
 * - Bearer JWT automático desde NextAuth
 * - Refresh transparente al recibir 401
 * - Redirige a /auth/login si el refresh falla
 * - X-Request-ID para trazabilidad
 */
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";
import { getSession, signOut } from "next-auth/react";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

let _isRefreshing = false;
let _failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null) {
  _failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  _failedQueue = [];
}

async function refreshAccessToken(): Promise<string> {
  const res = await fetch(`${BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    credentials: "include",
  });
  if (!res.ok) throw new Error("Refresh fallido");
  const data = await res.json();
  return data.access_token as string;
}

export function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,
    timeout: 30_000,
    headers: { "Content-Type": "application/json" },
  });

  // Request: añade JWT + X-Request-ID
  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const session = await getSession();
    const token = (session as any)?.accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    config.headers["X-Request-ID"] = crypto.randomUUID();
    return config;
  });

  // Response: refresh transparente en 401
  client.interceptors.response.use(
    (res) => res,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }

      if (_isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          _failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return client(original);
          })
          .catch(Promise.reject.bind(Promise));
      }

      original._retry = true;
      _isRefreshing = true;

      try {
        const newToken = await refreshAccessToken();
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return client(original);
      } catch (err) {
        processQueue(err, null);
        await signOut({ callbackUrl: "/auth/login" });
        return Promise.reject(err);
      } finally {
        _isRefreshing = false;
      }
    }
  );

  return client;
}

export const apiClient = createApiClient();
