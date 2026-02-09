import wretch from "wretch";
import Constants from "expo-constants";
import AsyncStorage from "@react-native-async-storage/async-storage";

const debuggerHost = Constants.expoConfig?.hostUri?.split(":").shift();

const getBaseUrl = () => {
  if (__DEV__ && debuggerHost) {
    return `http://${debuggerHost}:8080`;
  }
  return "http://localhost:8080";
};

export const API_URL = getBaseUrl();

export const api = async (token?: string) => {
  const jwt = token || (await AsyncStorage.getItem("accessToken"));
  return wretch(API_URL).headers(jwt ? { Authorization: `Bearer ${jwt}` } : {});
};
