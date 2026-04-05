import { createContext, ReactNode, useContext, useMemo } from "react";

export type MoveCameraParams = {
  latitude: number;
  longitude: number;
  delta?: number;
  duration?: number;
};

type MapCameraContextValue = {
  moveCamera: (params: MoveCameraParams) => void;
};

const defaultValue: MapCameraContextValue = {
  moveCamera: () => {},
};

const MapCameraContext = createContext<MapCameraContextValue>(defaultValue);

type MapCameraProviderProps = {
  children: ReactNode;
  moveCamera: (params: MoveCameraParams) => void;
};

/**
 * Provider for map camera control.
 * This allows any component within the provider to access the `moveCamera` function,
 * which can be used to programmatically move the map camera to a specific location.
 */
export function MapCameraProvider({
  children,
  moveCamera,
}: Readonly<MapCameraProviderProps>) {
  const value = useMemo(() => ({ moveCamera }), [moveCamera]);

  return (
    <MapCameraContext.Provider value={value}>
      {children}
    </MapCameraContext.Provider>
  );
}

/**
 * Context for accessing map camera control functions.
 */
export function useMapCamera() {
  return useContext(MapCameraContext);
}
