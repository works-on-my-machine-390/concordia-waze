import { api, API_URL } from "../hooks/api";

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
  beforeEach(() => {
    jest.clearAllMocks();
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
    await api(undefined);
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });

  test("api() with long token string includes full Authorization header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    const longToken =
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

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

    expect(emitSpy).toHaveBeenCalledWith("auth:expired");
    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
  });
});
