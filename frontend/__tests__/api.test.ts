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
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    await api("test-token");

    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
    expect(mockHeadersFn).toHaveBeenCalledWith({
      Authorization: "Bearer test-token",
    });
  });

  test("api() with empty token string includes Authorization header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    await api("");

    expect(wretch).toHaveBeenCalledWith("http://localhost:8080");
    expect(mockHeadersFn).toHaveBeenCalledWith({});
  });

  test("api() with null token calls without auth header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    await api(null as any);

    expect(mockHeadersFn).toHaveBeenCalledWith({});
  });

  test("api() with undefined token calls without auth header", async () => {
    const wretch = require("wretch");
    const mockHeadersFn = jest.fn();
    wretch.mockReturnValueOnce({
      headers: mockHeadersFn,
    });

    await api(undefined);

    expect(mockHeadersFn).toHaveBeenCalledWith({});
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
});
