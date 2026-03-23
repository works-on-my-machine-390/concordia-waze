import { useIndoorSearchStore } from "../hooks/useIndoorSearchStore";

describe("useIndoorSearchStore", () => {
  beforeEach(() => {
    useIndoorSearchStore.getState().clearSelectedPoiFilter();
    useIndoorSearchStore.getState().setFilteredPois(null);
  });

  test("sets and clears selected POI filter", () => {
    useIndoorSearchStore.getState().setSelectedPoiFilter("bathroom", "Bathrooms");

    expect(useIndoorSearchStore.getState().selectedPoiFilter).toEqual({
      type: "bathroom",
      label: "Bathrooms",
    });

    useIndoorSearchStore.getState().clearSelectedPoiFilter();

    expect(useIndoorSearchStore.getState().selectedPoiFilter).toBeNull();
  });

  test("sets filtered pois list", () => {
    const pois = [
      {
        name: "210",
        type: "room",
        building: "MB",
        floor_number: 2,
        latitude: 45.497,
        longitude: -73.579,
        position: { x: 0.1, y: 0.2 },
      },
    ] as any;

    useIndoorSearchStore.getState().setFilteredPois(pois);

    expect(useIndoorSearchStore.getState().filteredPois).toEqual(pois);

    useIndoorSearchStore.getState().setFilteredPois(null);

    expect(useIndoorSearchStore.getState().filteredPois).toBeNull();
  });
});
