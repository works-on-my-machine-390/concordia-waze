/* 
React hook managing authentication state and API interactions: providing login and register functions 
After need to change all API calls with real backend
*/
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { Toast } from "toastify-react-native";
import { API_URL, AUTH_EXPIRED_EVENT, isTokenExpired } from "./api";

type AuthResult =
  | { success: true; data?: any }
  | { success: false; error: string };

const API_BASE = API_URL;
const REQUEST_TIMEOUT_MS = 6000;

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const checkToken = async () => {
    const token = await SecureStore.getItemAsync("accessToken");
    if (token && !isTokenExpired(token)) {
      setLoggedIn(true);
      return true;
    }
    await SecureStore.deleteItemAsync("accessToken");
    setLoggedIn(false);
    return false;
  };

  useEffect(() => {
    checkToken();
    let isHandlingExpiry = false;
    const sub = DeviceEventEmitter.addListener(AUTH_EXPIRED_EVENT, async () => {
      if (isHandlingExpiry) return;
      isHandlingExpiry = true;
      console.log("AUTH_EXPIRED_EVENT received");
      Toast.error("Your session has expired. Please log in again.");
      await logout();
      router.replace({ pathname: "/login", params: { prev: "expired" } });
    });

    return () => sub.remove();
  }, []);

  async function authenticate(
    endpoint: string,
    payload: object,
    defaultError: string,
  ): Promise<AuthResult> {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const json = await res.json();

      if (res.ok && json?.token) {
        await SecureStore.setItemAsync("accessToken", json.token);
        setLoggedIn(true);
        return { success: true, data: json };
      }

      return {
        success: false,
        error: json?.error || json?.message || defaultError,
      };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return {
        success: false,
        error: isTimeout ? "Network error." : err?.message || "Network error.",
      };
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function login(email: string, password: string): Promise<AuthResult> {
    return authenticate(
      "/auth/login",
      { email, password },
      "Invalid credentials.",
    );
  }

  async function register(
    fullName: string,
    email: string,
    password: string,
  ): Promise<AuthResult> {
    return authenticate(
      "/auth/signup",
      { name: fullName, email, password },
      "Registration failed.",
    );
  }

  async function logout() {
  try {
    const token = await SecureStore.getItemAsync("accessToken");

    if (token) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    }
  } catch (err) {
    console.warn("Logout request failed:", err);
  } finally {
    await SecureStore.deleteItemAsync("accessToken");
    setLoggedIn(false);
    queryClient.removeQueries({ queryKey: ["courses"] });
  }
}

  return {
    login,
    register,
    logout,
    loading,
    loggedIn,
    checkToken,
  };
}