/* 
Central repository for app-wide constants including brand colors
*/

import { CampusCode } from "@/hooks/queries/buildingQueries";

// Brand Colors
export const COLORS = {
  maroon: "#7f2730",
  conuRed: "#912338",
  conuRedLight: "#F0C1CA",
  gold: "#B8AB85",
  goldDark: "#897334",
  error: "#b00020",
  textPrimary: "#222",
  textSecondary: "#666",
  textMuted: "#7a7a7a",
  background: "#FBFAFA",
  bgDark: "#E8E3E3",
  surface: "#fff",
  border: "#e0e0e0",
  selectionBlue: "#4180c0",
  selectionBlueBg: "rgba(184, 219, 255, 0.10)",
  poiMarkerBlue: "#29b2fc",
  success: "#4CAF50",
  warning: "#FF9800",
  accessibilityIcon: "#0E4C92",
};

export const DIRECTION_COLORS = {
  walking: "#1B53FD",
  driving: "#1B53FD", // same as walking
  shuttle: COLORS.goldDark,
  transit: "#429FE1", // the color to use is typically returned but this is the fallback for transit
  bicycling: "#1F8E3F",
};

// App Info
export const APP_INFO = {
  name: "Concordia Waze",
  tagline: "Find your way across campus - indoors & outdoors",
  taglineShort: "Navigate your campus with ease",
};

// Image Assets
export const LOGO_IMAGE = require("../assets/images/icon.png");
export const DIZZY_LOGO_IMAGE = require("../assets/images/icon-dizzy.png");
export const LOGO_SIZE = { width: 86, height: 86 };

// Map constants
export const DEFAULT_MAP_DELTA = 0.005;
export const DEFAULT_CAMERA_MOVE_DURATION_IN_MS = 500;

export const CAMPUS_COORDS = {
  [CampusCode.SGW]: { latitude: 45.4972, longitude: -73.5791 }, // SGW campus
  [CampusCode.LOY]: { latitude: 45.4589, longitude: -73.64 }, // Loyola campus
};

export const QUERY_RETRY_DELAY_MS = 3000;
export const BUILDINGS_WITH_INDOOR_MAPS = ['CC', 'H', 'LB', 'MB', 'VL'] as const;

// Classes constants
export const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
export const TYPES = ["Lecture", "Lab", "Tutorial"] as const;
