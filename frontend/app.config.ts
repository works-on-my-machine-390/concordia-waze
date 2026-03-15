import type { ConfigContext, ExpoConfig } from "expo/config";

const baseConfig = require("./app.json").expo as ExpoConfig;

export default ({ config }: ConfigContext): ExpoConfig => {
  const mapsApiKey =
    process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY;

  if (process.env.EAS_BUILD === "true" && !mapsApiKey) {
    throw new Error(
      "Missing Google Maps API key. Set EXPO_PUBLIC_GOOGLE_MAPS_API_KEY (or GOOGLE_MAPS_API_KEY) in EAS environment variables.",
    );
  }

  return {
    ...baseConfig,
    ...config,
    android: {
      ...baseConfig.android,
      ...config.android,
      config: {
        ...baseConfig.android?.config,
        ...config.android?.config,
        googleMaps: {
          ...baseConfig.android?.config?.googleMaps,
          ...config.android?.config?.googleMaps,
          apiKey: mapsApiKey || "MISSING_GOOGLE_MAPS_API_KEY",
        },
      },
    },
  };
};
