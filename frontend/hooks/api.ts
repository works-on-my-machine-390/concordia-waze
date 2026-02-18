import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";
import wretch from "wretch";

const debuggerHost = Constants.expoConfig?.hostUri?.split(":").shift();

const getBaseUrl = () => {
  if (__DEV__ && debuggerHost) {
    return `http://${debuggerHost}:8080`;
  }
  return "http://localhost:8080";
};

export const API_URL = getBaseUrl();

export const api = async (token?: string) => {
  const jwt = token || (await SecureStore.getItemAsync("accessToken"));
  return wretch(API_URL).headers(jwt ? { Authorization: `Bearer ${jwt}` } : {});
};
