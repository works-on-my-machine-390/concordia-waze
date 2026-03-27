import { useQuery } from "@tanstack/react-query";
import { api, isTokenExpired } from "../api";
import * as SecureStore from "expo-secure-store";

type UserProfile = {
  name: string;
  email: string;
  id: string;
};

// /auth/profile
export const useGetProfile = () => {
  const { data: isAuthenticated = false } = useQuery({
    queryKey: ["auth", "isAuthenticated"],
    queryFn: async () => {
      const token = await SecureStore.getItemAsync("accessToken");
      return Boolean(token) && !isTokenExpired(token);
    },
    staleTime: 1 * 60 * 1000, // 1 min
  });

  return useQuery({
    queryKey: ["get", "profile"],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .url("/auth/profile")
        .get()
        .json<UserProfile>()
        .catch(() => {
          return null;
        });
    },
    enabled: isAuthenticated,
  });
};
