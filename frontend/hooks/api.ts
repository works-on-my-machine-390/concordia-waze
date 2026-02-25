import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import wretch from "wretch";
import { DeviceEventEmitter } from "react-native";

const debuggerHost = Constants.expoConfig?.hostUri?.split(":").shift();
export const AUTH_EXPIRED_EVENT = "auth:expired";

const getBaseUrl = () => {
  if (__DEV__ && debuggerHost) {
    return `http://${debuggerHost}:8080`;
  }
  return "http://localhost:8080";
};

export const API_URL = getBaseUrl();

const isTokenExpired = (token: string): boolean => {
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
