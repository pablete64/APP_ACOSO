"use client";
/**
 * Hooks genéricos de React Query sobre el cliente API de SafeWork AI.
 * Uso: useApiQuery(["denuncias"], () => apiClient.get("/api/v1/denuncias"))
 */
import {
  useQuery,
  useMutation,
  type UseQueryOptions,
  type UseMutationOptions,
  type QueryKey,
} from "@tanstack/react-query";
import { AxiosResponse, AxiosError } from "axios";

type ApiError = AxiosError<{ detail: string }>;

/** Hook de lectura — GET */
export function useApiQuery<TData>(
  queryKey: QueryKey,
  fetcher: () => Promise<AxiosResponse<TData>>,
  options?: Omit<UseQueryOptions<TData, ApiError>, "queryKey" | "queryFn">
) {
  return useQuery<TData, ApiError>({
    queryKey,
    queryFn: async () => {
      const res = await fetcher();
      return res.data;
    },
    ...options,
  });
}

/** Hook de escritura — POST / PUT / PATCH / DELETE */
export function useApiMutation<TData, TVariables>(
  mutationFn: (variables: TVariables) => Promise<AxiosResponse<TData>>,
  options?: Omit<UseMutationOptions<TData, ApiError, TVariables>, "mutationFn">
) {
  return useMutation<TData, ApiError, TVariables>({
    mutationFn: async (variables) => {
      const res = await mutationFn(variables);
      return res.data;
    },
    ...options,
  });
}
