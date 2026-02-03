import wretch from "wretch";
import Constants from "expo-constants";

const debuggerHost = Constants.expoConfig?.hostUri?.split(":").shift();

const getBaseUrl = () => {
  if (__DEV__ && debuggerHost) {
    return `http://${debuggerHost}:8080`;
  }
  return "http://localhost:8080";
};

export const API_URL = getBaseUrl();


export const api = (token?: string) =>
  wretch(API_URL).headers(token ? { Authorization: `Bearer ${token}` } : {});

