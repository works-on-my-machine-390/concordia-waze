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
  recenterOnStepDuringActiveNavigation: "recenterOnStepDuringActiveNavigation",
  recenterAutomaticallyDuringActiveNavigation: "recenterAutomaticallyDuringActiveNavigation",
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
  recenterOnStepDuringActiveNavigation: boolean;
  recenterAutomaticallyDuringActiveNavigation: boolean;
};

type MapSettingsKey = (typeof MapSettings)[keyof typeof MapSettings];

const INITIAL_MAP_SETTINGS: MapSettings = {
  showShuttleStops: false,
  showBuildingPolygons: true,
  preferAccessibleRoutes: false,
  recenterOnStepDuringActiveNavigation: true,
  recenterAutomaticallyDuringActiveNavigation: true,
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
  {
    key: MapSettings.recenterOnStepDuringActiveNavigation,
    controlType: "switch",
    label: "Recenter on Step During Navigation",
    description:
      "While actively navigating, pressing next or previous step will recenter the map on the step's start point.",
    defaultValue: true,
  },
  {
    key: MapSettings.recenterAutomaticallyDuringActiveNavigation,
    controlType: "switch",
    label: "Recenter Automatically During Navigation",
    description:
      "While actively navigating, the map will automatically recenter on the user's location.",
    defaultValue: true,
  },
];
