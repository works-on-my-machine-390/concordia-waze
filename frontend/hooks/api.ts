import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import wretch from "wretch";
import { DeviceEventEmitter } from "react-native";

const debuggerHost = Constants.expoConfig?.hostUri?.split(":").shift();
export const AUTH_EXPIRED_EVENT = "auth:expired";
const FALLBACK_PRODUCTION_API_URL = "https://concordia-waze.onrender.com";
const NGROK_URL = "https://untapestried-katia-unmurmuringly.ngrok-free.dev";

const normalizeBaseUrl = (url: string) => url.replace(/\/$/, "");

const getApiOverride = () => {
  const override = process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE;

  if (!override) return null;

  switch (override) {
    case "local":
      return `http://${debuggerHost}:8080`;
    case "ngrok":
      return NGROK_URL;
    case "prod":
      return FALLBACK_PRODUCTION_API_URL;
    case "none":
    default:
      return null;
  }
};

const getBaseUrl = () => {
  const apiOverride = getApiOverride();

  if (apiOverride) {
    return apiOverride;
  }

  const configuredBaseUrl = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configuredBaseUrl) {
    return normalizeBaseUrl(configuredBaseUrl);
  }

  if (__DEV__) {
    return NGROK_URL;
  }

  return FALLBACK_PRODUCTION_API_URL;
};

export const API_URL = getBaseUrl();

export const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
};

export const api = async (token?: string) => {
  const jwt = token || (await SecureStore.getItemAsync("accessToken"));

  if (!jwt) {
    return wretch(API_URL);
  }

  if (isTokenExpired(jwt)) {
    await SecureStore.deleteItemAsync("accessToken");
    DeviceEventEmitter.emit(AUTH_EXPIRED_EVENT);
    return wretch(API_URL);
  }

  return wretch(API_URL).headers({ Authorization: `Bearer ${jwt}` });
};
