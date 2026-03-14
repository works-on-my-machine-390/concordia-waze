import { AUTH_EXPIRED_EVENT, api, API_URL, isTokenExpired } from "../hooks/api";
import * as SecureStore from "expo-secure-store";

// Mock wretch
jest.mock("wretch", () => {
  const mockHeaders = jest.fn();
  const mockWretch = jest.fn(() => ({
    headers: mockHeaders,
  }));
  mockWretch.mockReturnValue({
    headers: mockHeaders,
  });
  return mockWretch;
});

describe("api", () => {
  const originalDev = (globalThis as any).__DEV__;

  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).__DEV__ = true;
    delete process.env.EXPO_PUBLIC_API_URL;
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  test("API_URL defaults to localhost:8080", () => {
    // When REACT_APP_API_BASE is not set
    expect(API_URL).toBe("http://localhost:8080");
  });

  test("api() without token calls wretch with no auth header", async () => {
    const wretch = require("wretch");
    await api();
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("api() with token includes Authorization header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({ headers: mockHeadersFn });

    const validToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake";
    await api(validToken);

    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
    expect(mockHeadersFn).toHaveBeenCalledWith({
      Authorization: `Bearer ${validToken}`,
    });
  });

  test("api() with empty token string calls wretch without auth header", async () => {
    const wretch = require("wretch");
    await api("");
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("api() with null token calls without auth header", async () => {
    const wretch = require("wretch");
    await api(null as any);
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("api() with undefined token calls without auth header", async () => {
    const wretch = require("wretch");
    await api();
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("api() with long token string includes full Authorization header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    const longToken =
      "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.signature-with-many-characters";

    await api(longToken);

    expect(mockHeadersFn).toHaveBeenCalledWith({
      Authorization: `Bearer ${longToken}`,
    });
  });

  test("api() with expired token emits AUTH_EXPIRED_EVENT and returns wretch without auth", async () => {
    const wretch = require("wretch");
    const { DeviceEventEmitter } = require("react-native");
    const expiredToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjF9.fake";
    const emitSpy = jest.spyOn(DeviceEventEmitter, "emit");

    await api(expiredToken);

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith("accessToken");
    expect(emitSpy).toHaveBeenCalledWith(AUTH_EXPIRED_EVENT);
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("isTokenExpired() returns true for malformed token payload", () => {
    expect(isTokenExpired("not-a-jwt")).toBe(true);
  });

  test("API_URL uses EXPO_PUBLIC_API_URL when configured", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = "https://api.example.com/";

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).toBe("https://api.example.com");
    });
  });

  test("API_URL uses production fallback when not in development", () => {
    jest.resetModules();
    delete process.env.EXPO_PUBLIC_API_URL;

    jest.isolateModules(() => {
      (globalThis as any).__DEV__ = false;
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).toBe("https://concordia-waze.onrender.com");
    });
  });
});
