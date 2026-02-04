/* 
React hook managing authentication state and API interactions: providing login and register functions 
After need to change all API calls with real backend
MOCK DATA IS BEING USED TO ENSURE FRONTEND WORKS
*/
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

type AuthResult = { success: true; data?: any } | { success: false; error: string };

import { API_URL } from "./api";
const API_BASE = process.env.REACT_APP_API_BASE || API_URL;

export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false); 

  useEffect(() => {
    const checkToken = async () => {
      const token = await AsyncStorage.getItem("accessToken");
      const storedUser = await AsyncStorage.getItem("user");
      if (token) {
        setLoggedIn(true);
      }
    };
    checkToken();
  }, []);

  async function login(email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      setLoading(false);
      if (res.ok){
        if (json?.token) await AsyncStorage.setItem("accessToken", json.token);
        setLoggedIn(true);
        return { success: true, data: json };
      } 
      return { success: false, error: json?.error || json?.message || "Invalid credentials." };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || "Network error." };
    }
  }

  async function register(fullName: string, email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password }),
      });
      const json = await res.json();
      setLoading(false);
      if (res.ok){
        if (json?.token) await AsyncStorage.setItem("accessToken", json.token);
        setLoggedIn(true);
        return { success: true, data: json };
      } 
      return { success: false, error: json?.error || json?.message || "Registration failed." };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || "Network error." };
    }
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