import { getHttpStatusCode, shouldRetry429 } from "@/app/utils/queryUtils";

describe("queryUtils", () => {
  describe("getHttpStatusCode", () => {
    test("returns undefined for nullish and non-object values", () => {
      expect(getHttpStatusCode(undefined)).toBeUndefined();
      expect(getHttpStatusCode(null)).toBeUndefined();
      expect(getHttpStatusCode("error")).toBeUndefined();
      expect(getHttpStatusCode(123)).toBeUndefined();
    });

    test("returns top-level numeric status", () => {
      expect(getHttpStatusCode({ status: 429 })).toBe(429);
      expect(getHttpStatusCode({ status: 500 })).toBe(500);
    });

    test("returns nested response status when top-level status is missing", () => {
      expect(getHttpStatusCode({ response: { status: 404 } })).toBe(404);
    });

    test("ignores non-numeric status values", () => {
      expect(getHttpStatusCode({ status: "429" })).toBeUndefined();
      expect(getHttpStatusCode({ response: { status: "503" } })).toBeUndefined();
      expect(getHttpStatusCode({ status: "oops", response: { status: 429 } })).toBe(429);
    });
  });

  describe("shouldRetry429", () => {
    test("retries only for 429 when failure count is below 2", () => {
      expect(shouldRetry429(0, { status: 429 })).toBe(true);
      expect(shouldRetry429(1, { response: { status: 429 } })).toBe(true);
    });

    test("does not retry when failure count is 2 or more", () => {
      expect(shouldRetry429(2, { status: 429 })).toBe(false);
      expect(shouldRetry429(3, { response: { status: 429 } })).toBe(false);
    });

    test("does not retry for non-429 errors", () => {
      expect(shouldRetry429(0, { status: 500 })).toBe(false);
      expect(shouldRetry429(0, { response: { status: 404 } })).toBe(false);
      expect(shouldRetry429(1, new Error("network"))).toBe(false);
    });
  });
});
