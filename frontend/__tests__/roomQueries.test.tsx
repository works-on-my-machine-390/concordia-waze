import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetRoomLocation } from "../hooks/queries/roomQueries";
import { api } from "../hooks/api";
import type { ReactNode } from "react";

jest.mock("../hooks/api");

describe("roomQueries", () => {
  let queryClient: QueryClient;

  const createWrapper = () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    });

    return ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("useGetRoomLocation", () => {
    const mockRoomLocation = {
      x: 100,
      y: 200,
      floor: 2,
      building: "MB",
      room: "210",
    };

    const setupSuccessMock = () => {
      const mockGet = jest.fn().mockReturnValue({
        json: jest.fn().mockResolvedValue(mockRoomLocation),
      });

      (api as jest.Mock).mockResolvedValue({
        get: mockGet,
      });

      return mockGet;
    };

    test("parses H building room numbers correctly", async () => {
      const mockGet = setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("H892"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith(
        "/rooms/search?building=H&room=892"
      );
      expect(result.current.data).toEqual(mockRoomLocation);
    });

    test("parses two-letter building code room numbers correctly", async () => {
      const mockGet = setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("MB210"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith(
        "/rooms/search?building=MB&room=210"
      );
      expect(result.current.data).toEqual(mockRoomLocation);
    });

    test("handles S-prefix room numbers", async () => {
      const mockGet = setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("MBS2.285"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith(
        "/rooms/search?building=MB&room=S2.285"
      );
    });

    test("handles decimal room numbers", async () => {
      const mockGet = setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("CC2.185"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledWith(
        "/rooms/search?building=CC&room=2.185"
      );
    });

    test("does not fetch when room number is too short", () => {
      const mockGet = jest.fn();

      (api as jest.Mock).mockResolvedValue({
        get: mockGet,
      });

      const { result } = renderHook(
        () => useGetRoomLocation("M"),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    test("caches results with staleTime: Infinity", async () => {
      const mockGet = setupSuccessMock();

      const { result, rerender } = renderHook(
        ({ room }) => useGetRoomLocation(room),
        {
          initialProps: { room: "MB210" },
          wrapper: createWrapper(),
        }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockGet).toHaveBeenCalledTimes(1);

      rerender({ room: "MB210" });

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    test("uses correct query key", async () => {
      setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("MB210"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const queryKey =
        queryClient.getQueryCache().getAll()[0]?.queryKey;

      expect(queryKey).toEqual(["roomLocation", "MB210"]);
    });

    test("handles API errors", async () => {
      const mockGet = jest.fn().mockReturnValue({
        json: jest.fn().mockRejectedValue(new Error("API Error")),
      });

      (api as jest.Mock).mockResolvedValue({
        get: mockGet,
      });

      const { result } = renderHook(
        () => useGetRoomLocation("MB210"),
        { wrapper: createWrapper() }
      );

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeInstanceOf(Error);
    });

    test("handles empty room number", () => {
      const mockGet = jest.fn();

      (api as jest.Mock).mockResolvedValue({
        get: mockGet,
      });

      const { result } = renderHook(
        () => useGetRoomLocation(""),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(false);
      expect(mockGet).not.toHaveBeenCalled();
    });

    test("returns loading state initially", () => {
      setupSuccessMock();

      const { result } = renderHook(
        () => useGetRoomLocation("MB210"),
        { wrapper: createWrapper() }
      );

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });
});