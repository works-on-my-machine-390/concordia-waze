import { Platform } from "react-native";
import Constants from "expo-constants";

export type TelemetryParams = Record<
  string,
  string | number | boolean | null | undefined
>;

const taskTimers = new Map<string, number>();
let logRocketInitialized = false;

function normalizeParams(params?: TelemetryParams): Record<string, string | number> {
  if (!params) {
    return {};
  }

  const normalized: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (typeof value === "boolean") {
      normalized[key] = value ? 1 : 0;
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function getFirebaseAnalyticsInstance() {
  try {
    const analyticsModule = require("@react-native-firebase/analytics");
    return analyticsModule.default();
  } catch {
    return null;
  }
}

function getLogRocketModule() {
  try {
    const logRocketModule = require("@logrocket/react-native");
    return logRocketModule.default ?? logRocketModule;
  } catch {
    return null;
  }
}

function isAndroidNativeRuntime() {
  return (
    Platform.OS === "android" &&
    Constants.executionEnvironment !== "storeClient"
  );
}

export async function initTelemetry() {
  if (!isAndroidNativeRuntime()) {
    return;
  }

  const logRocketAppId = process.env.EXPO_PUBLIC_LOGROCKET_APP_ID;
  const logRocket = getLogRocketModule();
  if (!logRocket || !logRocketAppId || logRocketInitialized) {
    return;
  }

  try {
    logRocket.init(logRocketAppId); // Using env variable, but could be hardcoded if necessary
    logRocketInitialized = true;
  } catch {
    // Intentionally swallow to avoid blocking app startup if telemetry init fails.
  }
}

export async function trackScreen(screenName: string) {
  if (!isAndroidNativeRuntime()) {
    return;
  }

  const analytics = getFirebaseAnalyticsInstance();
  const logRocket = getLogRocketModule();

  try {
    await analytics?.logScreenView({
      screen_name: screenName,
      screen_class: screenName,
    });
  } catch {
    // Keep telemetry non-blocking.
  }

  try {
    logRocket?.tagPage?.(screenName);
  } catch {
    // Keep telemetry non-blocking.
  }
}

export async function trackEvent(eventName: string, params?: TelemetryParams) {
  if (!isAndroidNativeRuntime()) {
    return;
  }

  const normalizedParams = normalizeParams(params);
  const analytics = getFirebaseAnalyticsInstance();
  const logRocket = getLogRocketModule();

  try {
    await analytics?.logEvent(eventName, normalizedParams);
  } catch {
    // Keep telemetry non-blocking.
  }

  try {
    logRocket?.track?.(eventName, normalizedParams);
  } catch {
    // Keep telemetry non-blocking.
  }
}

export function startTaskTimer(taskName: string) {
  taskTimers.set(taskName, Date.now());
}

export async function endTaskTimer(
  taskName: string,
  extra?: TelemetryParams
): Promise<number | null> {
  const startedAt = taskTimers.get(taskName);
  if (!startedAt) {
    return null;
  }

  const durationMs = Date.now() - startedAt;
  taskTimers.delete(taskName);

  await trackEvent("task_completed", {
    task_name: taskName,
    duration_ms: durationMs,
    ...extra,
  });

  return durationMs;
}
