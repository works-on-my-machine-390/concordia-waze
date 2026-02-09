import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type UserProfile = {
  name: string;
  email: string;
  id: string;
};

// /auth/profile
export const useGetProfile = () =>
  useQuery({
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
  });
