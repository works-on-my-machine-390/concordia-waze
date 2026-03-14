import { useEffect, useMemo, useState } from "react";
import { extractFloorFromAddress } from "../app/utils/indoorNameFormattingUtils";
import {
  addGuestSearchHistory,
  clearGuestSearchHistory,
  getGuestSearchHistory,
} from "./guestStorage";
import type {
  ExtendedBuildingFloor,
  Floor,
  PointOfInterest,
} from "./queries/indoorMapQueries";
import {
  useClearUserHistory,
  useGetUserHistory,
  useSaveToHistory,
} from "./queries/userHistoryQueries";
import { useGetProfile } from "./queries/userQueries";

export type IndoorSearchResult = {
  poi: PointOfInterest;
  floor: Floor;
  type: "room" | "poi";
};

export type RecentIndoorSearch = {
  displayName: string;
  floor: number;
};

function calculateSearchScore(
  poi: PointOfInterest,
  query: string, // cleaned
  originalQuery: string,
): number {
  const poiName = poi.name.toLowerCase();
  const poiType = poi.type.toLowerCase();
  const poiTypeCleaned = poiType.replace(/_/g, " "); // eslint-disable-line prefer-string-replace-all

  const isPoi_X = /^poi_\d+$/i.test(poi.name);
  let searchableName = isPoi_X ? "" : poiName;

  if (searchableName.startsWith("room")) {
    searchableName = searchableName.replace(
      /^room\s*/i,
      poi.building.toLowerCase(),
    );
  }

  const exactNameMatch = searchableName === query;
  const exactTypeMatch = poiType === query || poiTypeCleaned === query;
  const nameStartsWith = searchableName?.startsWith(query) ?? false;
  const typeStartsWith =
    poiType.startsWith(query) || poiTypeCleaned.startsWith(query);
  const nameIncludes = searchableName?.includes(query) ?? false;
  const typeIncludes =
    poiType.includes(query) || poiTypeCleaned.includes(query);

  return (
    (exactNameMatch ? 10 : 0) +
    (exactTypeMatch ? 8 : 0) +
    (nameStartsWith ? 6 : 0) +
    (typeStartsWith ? 5 : 0) +
    (nameIncludes ? 3 : 0) +
    (typeIncludes ? 2 : 0)
  );
}

function deduplicateSearches(
  searches: RecentIndoorSearch[],
): RecentIndoorSearch[] {
  const seen = new Set<string>();
  const items: RecentIndoorSearch[] = [];

  for (const item of searches) {
    const key = `${item.displayName}-${item.floor}`;
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(item);
    if (items.length >= 6) break;
  }

  return items;
}

export const useIndoorSearch = (
  floors: ExtendedBuildingFloor[],
  query: string,
  buildingCode?: string, // optional - will restrict results to a given building if provided
) => {
  const { data: userProfile } = useGetProfile();
  const userId = userProfile?.id || "";
  const saveToHistory = useSaveToHistory(userId);
  const userHistoryQuery = useGetUserHistory(userId);
  const clearUserHistory = useClearUserHistory(userId);

  const [recentSearches, setRecentSearches] = useState<RecentIndoorSearch[]>(
    [],
  );

  useEffect(() => {
    let active = true;

    const loadSearches = async () => {
      if (userId) {
        const entries = userHistoryQuery.data ?? [];
        const buildingSearches = entries
          .filter(
            (item) =>
              (!buildingCode || item.building_code === buildingCode) &&
              item.destinationType === "room",
          )
          .map((item) => ({
            displayName: item.name,
            floor: extractFloorFromAddress(item.address),
          }));

        if (active) {
          setRecentSearches(deduplicateSearches(buildingSearches));
        }
      } else {
        const items = await getGuestSearchHistory();
        const buildingSearches = items
          .filter((item) => item.locations?.includes(buildingCode))
          .map((item) => ({
            displayName: item.query,
            floor: extractFloorFromAddress(item.locations || ""),
          }));

        if (active) {
          setRecentSearches(deduplicateSearches(buildingSearches));
        }
      }
    };

    loadSearches();

    return () => {
      active = false;
    };
  }, [userId, userHistoryQuery.data, buildingCode]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];

    const buildingCodeLower = buildingCode?.toLowerCase();
    let cleanedQuery = q;

    if (q.startsWith(buildingCodeLower)) {
      const afterCode = q.slice(buildingCodeLower.length).trim();
      if (/^[\d.]+$/.test(afterCode) || /^s\d/i.test(afterCode)) {
        cleanedQuery = afterCode;
      }
    }

    const matches: Array<IndoorSearchResult & { score: number }> = [];

    const relevantFloors = buildingCode
      ? floors.filter(
          (f) => !!f && f.name.toLowerCase().includes(buildingCodeLower),
        )
      : floors;

    for (const floor of relevantFloors) {
      for (const poi of floor.pois) {
        const extendedPoi = {
          ...poi,
          latitude: floor.latitude,
          longitude: floor.longitude,
          building: floor.building,
        };
        const score = calculateSearchScore(extendedPoi, cleanedQuery, q);

        if (score > 0) {
          matches.push({
            poi: extendedPoi,
            floor,
            type: poi.type.toLowerCase() === "room" ? "room" : "poi",
            score,
          });
        }
      }
    }

    return matches.sort((a, b) => b.score - a.score);
  }, [floors, query, buildingCode]);

  const addRecentSearch = async (
    roomName: string,
    roomCode: string,
    floorNumber: number,
  ) => {
    if (userId) {
      saveToHistory.mutate({
        name: roomName,
        address: `${buildingCode} - Floor ${floorNumber}`,
        lat: 0,
        lng: 0,
        building_code: buildingCode,
        destinationType: "room",
      });
    } else {
      await addGuestSearchHistory({
        query: roomName,
        locations: `${buildingCode} - Floor ${floorNumber}`,
        timestamp: new Date(),
      });

      setRecentSearches((prev) => {
        const filtered = prev.filter((item) => item.displayName !== roomName);
        return [
          { displayName: roomName, floor: floorNumber },
          ...filtered,
        ].slice(0, 5);
      });
    }
  };

  const clearRecentSearches = async () => {
    if (userId) {
      clearUserHistory.mutate(undefined, {
        onSuccess: () => setRecentSearches([]),
        onError: () => setRecentSearches([]),
      });
    } else {
      await clearGuestSearchHistory();
      setRecentSearches([]);
    }
  };

  return {
    results,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  };
};
