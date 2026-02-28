import { BuildingListItem } from "@/hooks/queries/buildingQueries";

export const filterBuildingsByQuery = (
  query: string,
  buildingList: BuildingListItem[],
) : BuildingListItem[] => {
  if (query.trim() === "" || !buildingList || buildingList.length === 0) {
    return [];
  }

  return buildingList
    .map((b) => {
      const name = b?.name ?? undefined;
      const longName = b?.long_name ?? undefined;
      const address = b?.address ?? undefined;
      const q = query.toLowerCase();
      const exactCodeMatch = b.code.toLowerCase() === q;
      const codeMatch = b.code.toLowerCase().includes(q);
      const nameMatch = name ? name.toLowerCase().includes(q) : false;
      const longMatch = longName ? longName.toLowerCase().includes(q) : false;
      const addressMatch = address ? address.toLowerCase().includes(q) : false;
      // Simple scoring: code matches are most relevant, then name, then address
      const score =
        (exactCodeMatch ? 5 : 0) +
        (codeMatch ? 3 : 0) +
        (nameMatch || longMatch ? 2 : 0) +
        (addressMatch ? 1 : 0);
      return {
        code: b.code,
        campus: b.campus,
        name,
        long_name: longName,
        address,
        score,
        codeMatch,
        nameMatch,
        longMatch,
        addressMatch,
        latitude: b.latitude,
        longitude: b.longitude,
      };
    })
    .filter(
      (item) =>
        item.codeMatch || item.nameMatch || item.longMatch || item.addressMatch,
    )
    .sort((a, b) => b.score - a.score);
};
