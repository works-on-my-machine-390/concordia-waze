import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api";

export type HistoryLocation = {
  name: string;
  address: string;
  lat?: number;  
  lng?: number; 
  building_code?: string;  
  destinationType?: string;  
};

// Hook to fetch user history
export const useGetUserHistory = (userId: string) => {
  return useQuery<HistoryLocation[]>({
    queryKey: ["userHistory", userId],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .url(`/users/${userId}/history`)
        .get()
        .json<HistoryLocation[]>()
        .catch(() => [] as HistoryLocation[]);
    },
    staleTime: 5 * 60 * 1000, 
  });
};

// Hook to save location to history
export const useSaveToHistory = (userId: string) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (location: HistoryLocation) => {
      const apiClient = await api();
      return apiClient
        .url(`/users/${userId}/history`)
        .post(location)
        .json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userHistory", userId] });
    },
  });
};

// Hook to clear user history
export const useClearUserHistory = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const apiClient = await api();
      return apiClient
        .url(`/users/${userId}/history`)
        .delete()
        .json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userHistory", userId] });
    },
  });
};
