import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// When adding new settings, add the key here, then in the MapSettingsList,
// then the MapSettings type,
// and finally in the initialMapSettings object in the store.
export const MapSettings = {
  showShuttleStops: "showShuttleStops",
  showBuildingPolygons: "showBuildingPolygons",
  preferAccessibleRoutes: "preferAccessibleRoutes",
} as const;

export type MapSettingRecord = {
  key: MapSettingsKey;
  controlType?: "switch" | "dropdown"; // can be extended later on
  label: string;
  description: string;
  defaultValue: boolean;
};

export type MapSettings = {
  showShuttleStops: boolean;
  showBuildingPolygons: boolean;
  preferAccessibleRoutes: boolean;
};

type MapSettingsKey = (typeof MapSettings)[keyof typeof MapSettings];

const INITIAL_MAP_SETTINGS: MapSettings = {
  showShuttleStops: false,
  showBuildingPolygons: true,
  preferAccessibleRoutes: false,
};

type MapSettingsStore = {
  mapSettings: MapSettings;
  updateSetting: (key: MapSettingsKey, value: boolean) => void;
};

// Zustand store for managing map settings with persistence using AsyncStorage.
const useMapSettingsStore = create<MapSettingsStore>()(
  persist(
    (set) => ({
      mapSettings: INITIAL_MAP_SETTINGS,
      updateSetting: (key, value) => {
        if (!(key in INITIAL_MAP_SETTINGS)) {
          return;
        }

        set((state) => ({
          mapSettings: {
            ...state.mapSettings,
            [key]: value,
          },
        }));
      },
    }),
    {
      name: "map-settings",
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState: any, currentState) => {
        return {
          ...currentState,
          ...persistedState,
          mapSettings: {
            ...currentState.mapSettings, // keep initial settings and newly added settings
            ...persistedState?.mapSettings, // override with persisted values
          },
        };
      },
    },
  ),
);

export default function useMapSettings() {
  const mapSettings = useMapSettingsStore((state) => state.mapSettings);
  const updateSetting = useMapSettingsStore((state) => state.updateSetting);

  return {
    mapSettings,
    updateSetting,
  };
}

// This list defines the available map settings, their labels, descriptions, and control types.
export const MapSettingsList: MapSettingRecord[] = [
  {
    key: MapSettings.showShuttleStops,
    controlType: "switch",
    label: "Show Shuttle Stops",
    description: "Toggle the visibility of shuttle stops on the map.",
    defaultValue: false,
  },
  {
    key: MapSettings.showBuildingPolygons,
    controlType: "switch",
    label: "Show Building Polygons",
    description:
      "Toggle the visibility of Concordia building polygons on the map.",
    defaultValue: true,
  },
  {
    key: MapSettings.preferAccessibleRoutes,
    controlType: "switch",
    label: "Prefer Accessible Routes",
    description:
      "(For Indoor Navigation) When enabled, routes avoid stairs and elevators or ramps are used when changing floors.",
    defaultValue: false,
  },
];
