import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type GoogleAuthConnected = { ok: true };
type GoogleAuthRequired = { url: string };
export type GoogleAuthStatus = GoogleAuthConnected | GoogleAuthRequired;

export const isAuthRequired = (s: GoogleAuthStatus): s is GoogleAuthRequired =>
  "url" in s;

export const getGoogleAuthStatus = async (userId?: string): Promise<GoogleAuthStatus> => {
  const apiClient = await api();
  const path = userId ? `/auth/google?userId=${encodeURIComponent(userId)}` : "/auth/google";
  return apiClient.url(path).get().json<GoogleAuthStatus>();
};

export const useGoogleAuthStatus = (userId?: string, options?: { enabled?: boolean }) =>
  useQuery<GoogleAuthStatus, Error>({
    queryKey: ["google", "auth", "status", userId ?? null],
    queryFn: () => getGoogleAuthStatus(userId),
    enabled: options?.enabled ?? !!userId,
  });
