import { useQueryClient } from "@tanstack/react-query";
import { act, render } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import React from "react";
import { useAuth } from "../hooks/useAuth";

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

// Helper component to expose hook functions to the test scope
let loginFn: any;
let registerFn: any;
let logoutFn: any;

function HookProxy() {
  const { login, register, logout } = useAuth();
  React.useEffect(() => {
    loginFn = login;
    registerFn = register;
    logoutFn = logout;
  }, [login, register, logout]);
  return null;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      HookProxy: any;
    }
  }
}

describe("useAuth", () => {
  const removeQueries = jest.fn();

  beforeEach(() => {
    loginFn = undefined;
    registerFn = undefined;
    logoutFn = undefined;
    (globalThis as any).fetch = jest.fn();
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue({
      removeQueries,
    });
  });

  test("login success returns token and user", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc", user: { email: "a@b.com" } }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "pass");
    });

    expect(res).toEqual({
      success: true,
      data: { token: "abc", user: { email: "a@b.com" } },
    });
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("login failure returns backend error", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Invalid credentials" }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "wrongpass");
    });

    expect(res).toEqual({ success: false, error: "Invalid credentials" });
  });

  test("login failure with message field", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "User not found" }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("notfound@b.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "User not found" });
  });

  test("login failure with no error details returns default message", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Invalid credentials." });
  });

  test("login network error returns network error message", async () => {
    (globalThis as any).fetch.mockRejectedValueOnce(
      new Error("Network timeout"),
    );

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Network timeout" });
  });

  test("login network error with no message returns default", async () => {
    (globalThis as any).fetch.mockRejectedValueOnce({});

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await loginFn("a@b.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Network error." });
  });

  test("register success returns user", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: "1",
        name: "Test",
        email: "t@e.com",
        token: "tok",
      }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "t@e.com", "pass");
    });

    expect(res).toEqual({
      success: true,
      data: { id: "1", name: "Test", email: "t@e.com", token: "tok" },
    });
    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signup"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("register failure surfaces backend error", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "This email is already registered." }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "exists@e.com", "pass");
    });

    expect(res).toEqual({
      success: false,
      error: "This email is already registered.",
    });
  });

  test("register failure with message field", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Invalid email format" }),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "invalid-email", "pass");
    });

    expect(res).toEqual({ success: false, error: "Invalid email format" });
  });

  test("register failure with no error details returns default message", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "t@e.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Registration failed." });
  });

  test("register network error returns network error message", async () => {
    (globalThis as any).fetch.mockRejectedValueOnce(
      new Error("Connection refused"),
    );

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "t@e.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Connection refused" });
  });

  test("register network error with no message returns default", async () => {
    (globalThis as any).fetch.mockRejectedValueOnce({});

    render(React.createElement(HookProxy));

    let res: any;
    await act(async () => {
      res = await registerFn("Test", "t@e.com", "pass");
    });

    expect(res).toEqual({ success: false, error: "Network error." });
  });

  test("login includes correct headers and body", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: "abc" }),
    });

    render(React.createElement(HookProxy));

    await act(async () => {
      await loginFn("test@example.com", "password123");
    });

    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "test@example.com",
          password: "password123",
        }),
      }),
    );
  });

  test("register includes correct headers and body", async () => {
    (globalThis as any).fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "1" }),
    });

    render(React.createElement(HookProxy));

    await act(async () => {
      await registerFn("John Doe", "john@example.com", "password123");
    });

    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/signup"),
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "John Doe",
          email: "john@example.com",
          password: "password123",
        }),
      }),
    );
  });

  test("logout calls backend with token and clears storage", async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce("mock-token")
      .mockResolvedValueOnce("mock-token");
    (globalThis as any).fetch.mockResolvedValueOnce({ ok: true });

    render(React.createElement(HookProxy));

    await act(async () => {
      await logoutFn();
    });

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith("accessToken");

    expect((globalThis as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/logout"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
          "Content-Type": "application/json",
        }),
      }),
    );

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ["courses"] });
  });

  test("logout without token does not call backend but clears storage", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);

    render(React.createElement(HookProxy));

    await act(async () => {
      await logoutFn();
    });

    expect((globalThis as any).fetch).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ["courses"] });
  });

  test("logout clears storage even if backend request fails", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce("mock-token");
    (globalThis as any).fetch.mockRejectedValueOnce(new Error("Server down"));

    render(React.createElement(HookProxy));

    await act(async () => {
      await logoutFn();
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
    expect(removeQueries).toHaveBeenCalledWith({ queryKey: ["courses"] });
  });

  test("checkToken returns false and clears storage when token is expired", async () => {
    const expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.fake";
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(expiredToken);

    render(React.createElement(HookProxy));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
  });

  test("checkToken returns true when token is valid", async () => {
    const validToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake";
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(validToken);

    render(React.createElement(HookProxy));

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  test("AUTH_EXPIRED_EVENT triggers logout", async () => {
    const { DeviceEventEmitter } = require("react-native");
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (globalThis as any).fetch.mockResolvedValue({ ok: true });

    render(React.createElement(HookProxy));

    await act(async () => {
      DeviceEventEmitter.emit("auth:expired");
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
  });
});