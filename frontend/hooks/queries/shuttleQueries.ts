import { useQuery } from "@tanstack/react-query";
import { api } from "../api";

type ShuttleSchedule = Record<string, Record<string, string[]>>;

const fetchShuttleSchedule = async (): Promise<ShuttleSchedule> => {
  const client = await api();
  const raw: ShuttleSchedule = await client.get("/shuttle").json();

  const normalized: ShuttleSchedule = {};
  for (const [key, value] of Object.entries(raw)) {
    normalized[key.toLowerCase()] = value;
  }
  return normalized;
};

export const useGetShuttleSchedule = () =>
  useQuery<ShuttleSchedule>({
    queryKey: ["shuttle"],
    queryFn: fetchShuttleSchedule,
  });
export type ShuttleLocationsType = {
  LOY: {
    lat: number;
    lng: number;
  };
  SGW: {
    lat: number;
    lng: number;
  };
};

export const useGetShuttlePositions = () => {
  const query = useQuery<ShuttleLocationsType>({
    queryKey: ["get", "shuttle", "markers"],
    queryFn: async () => {
      const apiClient = await api();
      return apiClient
        .get(`/shuttle/markers`)
        .json<ShuttleLocationsType>()
        .catch(() => ({
          LOY: {
            lat: 45.497163,
            lng: -73.578535,
          },
          SGW: {
            lat: 45.458424,
            lng: -73.638369,
          },
        }));
    },
    staleTime: Infinity,
  });

  return query;
};
