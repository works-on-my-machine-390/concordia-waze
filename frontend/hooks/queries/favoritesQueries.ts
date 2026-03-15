import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../api";

export type FavoriteType = "outdoor" | "indoor";

export type FavoriteLocation = {
  id: string;
  userId: string;
  type: FavoriteType;
  name: string;
  latitude?: number;
  longitude?: number;
  buildingCode?: string;
  floorNumber?: number;
  x?: number;
  y?: number;
  poiType?: string;
};

export type CreateFavoriteRequest =
  | {
      type: "outdoor";
      name: string;
      latitude: number;
      longitude: number;
    }
  | {
      type: "indoor";
      name: string;
      buildingCode: string;
      floorNumber: number;
      x: number;
      y: number;
      poiType?: string;
    };

const GUEST_USER_ID = "guest";
const GUEST_FAVORITES_STORAGE_KEY = "guest_favorites";

const isGuestUser = (userId?: string) => !userId || userId === GUEST_USER_ID;

const readGuestFavorites = async (): Promise<FavoriteLocation[]> => {
  try {
    const raw = await AsyncStorage.getItem(GUEST_FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FavoriteLocation[]) : [];
  } catch {
    return [];
  }
};

const writeGuestFavorites = async (favorites: FavoriteLocation[]) => {
  await AsyncStorage.setItem(
    GUEST_FAVORITES_STORAGE_KEY,
    JSON.stringify(favorites),
  );
};

export const useGetUserFavorites = (userId: string, enabled = true) => {
  return useQuery<FavoriteLocation[]>({
    queryKey: ["userFavorites", userId],
    queryFn: async () => {
      if (isGuestUser(userId)) {
        return readGuestFavorites();
      }

      const apiClient = await api();
      return apiClient
        .url(`/users/${userId}/favorites`)
        .get()
        .json<FavoriteLocation[]>()
        .catch(() => [] as FavoriteLocation[]);
    },
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    enabled: enabled && !!userId,
  });
};

export const useCreateFavorite = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateFavoriteRequest) => {
      if (isGuestUser(userId)) {
        const existing = await readGuestFavorites();
        const nowId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const created: FavoriteLocation =
          payload.type === "outdoor"
            ? {
                id: nowId,
                userId: GUEST_USER_ID,
                type: "outdoor",
                name: payload.name,
                latitude: payload.latitude,
                longitude: payload.longitude,
              }
            : {
                id: nowId,
                userId: GUEST_USER_ID,
                type: "indoor",
                name: payload.name,
                buildingCode: payload.buildingCode,
                floorNumber: payload.floorNumber,
                x: payload.x,
                y: payload.y,
                poiType: payload.poiType,
              };

        await writeGuestFavorites([created, ...existing]);
        return created;
      }

      const apiClient = await api();
      return apiClient
        .url(`/users/${userId}/favorites`)
        .post(payload)
        .json<FavoriteLocation>();
    },
    onSuccess: (createdFavorite) => {
      queryClient.setQueryData<FavoriteLocation[]>(
        ["userFavorites", userId],
        (current) => {
          const list = current || [];
          if (list.some((item) => item.id === createdFavorite.id)) {
            return list;
          }
          return [createdFavorite, ...list];
        },
      );
    },
  });
};

export const useDeleteFavorite = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (favoriteId: string) => {
      if (isGuestUser(userId)) {
        const existing = await readGuestFavorites();
        const next = existing.filter((favorite) => favorite.id !== favoriteId);
        await writeGuestFavorites(next);
        return { id: favoriteId };
      }

      const apiClient = await api();
      await apiClient.url(`/users/${userId}/favorites/${favoriteId}`).delete().res();
      return { id: favoriteId };
    },
    onSuccess: ({ id }) => {
      queryClient.setQueryData<FavoriteLocation[]>(
        ["userFavorites", userId],
        (current) => (current || []).filter((favorite) => favorite.id !== id),
      );
    },
  });
};
