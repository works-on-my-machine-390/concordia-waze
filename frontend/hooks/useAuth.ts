/* 
React hook managing authentication state and API interactions: providing login and register functions 
After need to change all API calls with real backend
*/
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

type AuthResult =
  | { success: true; data?: any }
  | { success: false; error: string };

import { Toast } from "toastify-react-native";
import { API_URL } from "./api";
const API_BASE = process.env.REACT_APP_API_BASE || API_URL;

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        setLoggedIn(true);
      }
    };
    checkToken();
  }, []);

  async function authenticate(
    endpoint: string,
    payload: object,
    defaultError: string,
  ): Promise<AuthResult> {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setLoading(false);

      if (res.ok && json?.token) {
        await AsyncStorage.setItem("accessToken", json.token);
        setLoggedIn(true);
        return { success: true, data: json };
      }

      return {
        success: false,
        error: json?.error || json?.message || defaultError,
      };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || "Network error." };
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
      const token = await AsyncStorage.getItem("accessToken");

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
      await AsyncStorage.removeItem("accessToken");
      Toast.success("Logged out successfully.");
      setLoggedIn(false);
    }
  }

  return {
    login,
    register,
    logout,
    loading,
    loggedIn,
  };
}
