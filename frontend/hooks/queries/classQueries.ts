import { QUERY_RETRY_DELAY_MS } from "@/app/constants";
import { shouldRetry429 } from "@/app/utils/queryUtils";
import { ClassItem } from "@/hooks/firebase/useFirestore";
import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

export type NextClassResponse = {
  className: string;
  buildingLatitude: number;
  buildingLongitude: number;
  floorNumber: number;
  roomX: number;
  roomY: number;
  item: ClassItem;
};

export const useGetNextClass = (enabled: boolean) => {
  return useQuery<NextClassResponse>({
    queryKey: ["nextClass"],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient.get("/courses/next").json<NextClassResponse>();
    },
    staleTime: Infinity,
    enabled,
    retry: shouldRetry429,
    retryDelay: QUERY_RETRY_DELAY_MS,
  });
};
