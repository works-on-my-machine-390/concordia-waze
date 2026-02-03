/* 
React hook managing authentication state and API interactions: providing login and register functions 
After need to change all API calls with real backend
MOCK DATA IS BEING USED TO ENSURE FRONTEND WORKS
*/
import { useState } from "react";

type AuthResult = { success: true; data?: any } | { success: false; error: string };

// Replace with your backend base URL

const API_BASE = "";

export function useAuth() {
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    try {
      if (!API_BASE) {
        // Mock: accept any concordia email with password "password123" during login
        await new Promise((r) => setTimeout(r, 700));
        if (password === "password123") {
          setLoading(false);
          return { success: true, data: { token: "mock-token", user: { email } } };
        } else {
          setLoading(false);
          return { success: false, error: "Invalid email or password." };
        }
      }
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      setLoading(false);
      if (res.ok) return { success: true, data: json };
      return { success: false, error: json?.message || "Invalid credentials." };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || "Network error." };
    }
  }

  async function register(fullName: string, email: string, password: string): Promise<AuthResult> {
    setLoading(true);
    try {
      if (!API_BASE) {
        // Mock registration: fail if email contains "taken" during registration
        await new Promise((r) => setTimeout(r, 900));
        if (email.includes("taken")) {
          setLoading(false);
          return { success: false, error: "This email is already registered." };
        }
        setLoading(false);
        return { success: true, data: { user: { email, fullName } } };
      }
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, password }),
      });
      const json = await res.json();
      setLoading(false);
      if (res.ok) return { success: true, data: json };
      return { success: false, error: json?.message || "Registration failed." };
    } catch (err: any) {
      setLoading(false);
      return { success: false, error: err?.message || "Network error." };
    }
  }

  return { login, register, loading };
}