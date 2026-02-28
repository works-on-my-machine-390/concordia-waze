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