/* 
React hook managing authentication state and API interactions: providing login and register functions 
After need to change all API calls with real backend
MOCK DATA IS BEING USED TO ENSURE FRONTEND WORKS
*/
import { useState } from "react";
type AuthResult = { success: true; data?: any } | { success: false; error: string };

import { API_URL } from "./api";
const API_BASE = process.env.REACT_APP_API_BASE || API_URL;
const REQUEST_TIMEOUT_MS = 8000;

export function useAuth() {
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (res.ok) return { success: true, data: json };
      return { success: false, error: json?.error || json?.message || "Invalid credentials." };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return { success: false, error: isTimeout ? "Network error." : (err?.message || "Network error.") };
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  async function register(fullName: string, email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(`${API_BASE}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: fullName, email, password }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (res.ok) return { success: true, data: json };
      return { success: false, error: json?.error || json?.message || "Registration failed." };
    } catch (err: any) {
      const isTimeout = err?.name === "AbortError";
      return { success: false, error: isTimeout ? "Network error." : (err?.message || "Network error.") };
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }

  return { login, register, loading };
}