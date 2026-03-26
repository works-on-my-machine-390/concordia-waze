import { AUTH_EXPIRED_EVENT, api, API_URL, isTokenExpired } from "../hooks/api";
import * as SecureStore from "expo-secure-store";

const testApiUrl = "https://api.example.com";

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
    delete process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE;
  });

  afterAll(() => {
    (globalThis as any).__DEV__ = originalDev;
  });

  test("API_URL defaults to the module base URL when not configured", () => {
    expect(API_URL).toBe("https://untapestried-katia-unmurmuringly.ngrok-free.dev");
  });

  test("api() without token calls wretch with no auth header", async () => {
    const wretch = require("wretch");
    await api();
    expect(wretch).toHaveBeenCalledWith(API_URL);
  });

  test("api() with token includes Authorization header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({ headers: mockHeadersFn });

    const validToken = "eyJhbGciOiJIUzI1NiJ9.eyJleHAiOjk5OTk5OTk5OTl9.fake";
    await api(validToken);

    expect(wretch).toHaveBeenCalledWith(API_URL);
    expect(mockHeadersFn).toHaveBeenCalledWith({
      Authorization: `Bearer ${validToken}`,
    });
  });

  test("api() with empty token string calls wretch without auth header", async () => {
    const wretch = require("wretch");
    await api("");
    expect(wretch).toHaveBeenCalledWith(API_URL);
  });

  test("api() with null token calls without auth header", async () => {
    const wretch = require("wretch");
    await api(null as any);
    expect(wretch).toHaveBeenCalledWith(API_URL);
  });

  test("api() with undefined token calls without auth header", async () => {
    const wretch = require("wretch");
    await api();
    expect(wretch).toHaveBeenCalledWith(API_URL);
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
    expect(wretch).toHaveBeenCalledWith(API_URL);
  });

  test("isTokenExpired() returns true for malformed token payload", () => {
    expect(isTokenExpired("not-a-jwt")).toBe(true);
  });

  test("API_URL uses EXPO_PUBLIC_API_URL when configured", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_URL = testApiUrl;

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).toBe(testApiUrl);
    });
  });

  test("API_URL uses local override when EXPO_PUBLIC_API_OVERRIDE_TYPE is local", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE = "local";
    process.env.EXPO_PUBLIC_API_URL = testApiUrl;

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).not.toBe(testApiUrl);
    });
  });

  test("API_URL uses ngrok override when EXPO_PUBLIC_API_OVERRIDE_TYPE is ngrok", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE = "ngrok";

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).not.toBe(testApiUrl);
    });
  });

  test("API_URL uses production override when EXPO_PUBLIC_API_OVERRIDE_TYPE is prod", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE = "prod";

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).not.toBe(testApiUrl);
    });
  });

  test("API_URL ignores configured URL when override is set", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE = "ngrok";
    process.env.EXPO_PUBLIC_API_URL = testApiUrl;

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).not.toBe(testApiUrl);
    });
  });

  test("API_URL falls back to configured URL when override is none", () => {
    jest.resetModules();
    process.env.EXPO_PUBLIC_API_OVERRIDE_TYPE = "none";
    process.env.EXPO_PUBLIC_API_URL = testApiUrl;

    jest.isolateModules(() => {
      const isolated = require("../hooks/api");
      expect(isolated.API_URL).toBe(testApiUrl);
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
