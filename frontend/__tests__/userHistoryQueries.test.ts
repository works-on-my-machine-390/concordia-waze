import React from "react";
import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGetUserHistory, useSaveToHistory } from "../hooks/queries/userHistoryQueries";
import { api } from "../hooks/api";

// Mock the api module
jest.mock("../hooks/api", () => ({
  api: jest.fn(),
}));

// Mock AsyncStorage (required by api)
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Helper to create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

// Wrapper component that provides QueryClient context
const createWrapper = () => {
  const queryClient = createTestQueryClient();
  return function WrapperComponent({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      children
    );
  };
};

describe("userHistoryQueries", () => {
  let mockApiClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockApiClient = {
      url: jest.fn().mockReturnThis(),
      get: jest.fn().mockReturnThis(),
      post: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    (api as jest.Mock).mockResolvedValue(mockApiClient);
  });

  describe("useGetUserHistory", () => {
    test("fetches user history successfully", async () => {
      const mockHistory = [
        {
          name: "Hall Building",
          address: "1455 De Maisonneuve Blvd W",
          lat: 45.497,
          lng: -73.579,
          building_code: "H",
          destinationType: "building",
        },
        {
          name: "Engineering Building",
          address: "1515 St. Catherine W",
          lat: 45.495,
          lng: -73.577,
          building_code: "EV",
          destinationType: "building",
        },
      ];

      mockApiClient.json.mockResolvedValueOnce(mockHistory);

      const { result } = renderHook(() => useGetUserHistory("user-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual(mockHistory);
      expect(mockApiClient.url).toHaveBeenCalledWith("/users/user-123/history");
      expect(mockApiClient.get).toHaveBeenCalled();
      expect(mockApiClient.json).toHaveBeenCalled();
    });

    test("returns empty array on error", async () => {
      mockApiClient.json.mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useGetUserHistory("user-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    test("uses correct query key", async () => {
      mockApiClient.json.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGetUserHistory("user-456"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.url).toHaveBeenCalledWith("/users/user-456/history");
    });

    test("handles empty history array", async () => {
      mockApiClient.json.mockResolvedValueOnce([]);

      const { result } = renderHook(() => useGetUserHistory("user-123"), {
        wrapper: createWrapper(),
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(result.current.data).toEqual([]);
    });

    test("returns loading state initially", () => {
      mockApiClient.json.mockImplementationOnce(
        () => new Promise(() => {}), 
      );

      const { result } = renderHook(() => useGetUserHistory("user-123"), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.data).toBeUndefined();
    });
  });

  describe("useSaveToHistory", () => {
    test("saves location to history successfully", async () => {
      const mockResponse = { success: true };
      mockApiClient.json.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSaveToHistory("user-123"), {
        wrapper: createWrapper(),
      });

      const newLocation = {
        name: "Hall Building",
        address: "1455 De Maisonneuve Blvd W",
        lat: 45.497,
        lng: -73.579,
        building_code: "H",
        destinationType: "building",
      };

      await waitFor(() => {
        result.current.mutate(newLocation);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.url).toHaveBeenCalledWith("/users/user-123/history");
      expect(mockApiClient.post).toHaveBeenCalledWith(newLocation);
      expect(mockApiClient.json).toHaveBeenCalled();
    });

    test("handles location without optional fields", async () => {
      const mockResponse = { success: true };
      mockApiClient.json.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSaveToHistory("user-123"), {
        wrapper: createWrapper(),
      });

      const minimalLocation = {
        name: "Custom Location",
        address: "123 Main St",
      };

      await waitFor(() => {
        result.current.mutate(minimalLocation);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith(minimalLocation);
    });

    test("handles mutation error", async () => {
      mockApiClient.json.mockRejectedValueOnce(new Error("Server error"));

      const { result } = renderHook(() => useSaveToHistory("user-123"), {
        wrapper: createWrapper(),
      });

      const newLocation = {
        name: "Hall Building",
        address: "1455 De Maisonneuve Blvd W",
      };

      await waitFor(() => {
        result.current.mutate(newLocation);
      });

      await waitFor(() => expect(result.current.isError).toBe(true));

      expect(result.current.error).toBeTruthy();
    });

    test("invalidates query cache on success", async () => {
      const mockResponse = { success: true };
      mockApiClient.json.mockResolvedValueOnce(mockResponse);

      const queryClient = createTestQueryClient();
      const invalidateSpy = jest.spyOn(queryClient, "invalidateQueries");

      function TestWrapper({ children }: { children: React.ReactNode }) {
        return React.createElement(
          QueryClientProvider,
          { client: queryClient },
          children
        );
      }

      const { result } = renderHook(() => useSaveToHistory("user-123"), {
        wrapper: TestWrapper,
      });

      const newLocation = {
        name: "Hall Building",
        address: "1455 De Maisonneuve Blvd W",
      };

      await waitFor(() => {
        result.current.mutate(newLocation);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: ["userHistory", "user-123"],
      });
    });

    test("returns loading state during mutation", async () => {
        let resolveMutation: any;
        const mutationPromise = new Promise((resolve) => {
            resolveMutation = resolve;
        });

        mockApiClient.json.mockReturnValueOnce(mutationPromise);

        const { result } = renderHook(() => useSaveToHistory("user-123"), {
            wrapper: createWrapper(),
        });

        const newLocation = {
            name: "Hall Building",
            address: "1455 De Maisonneuve Blvd W",
        };

        result.current.mutate(newLocation);

        await waitFor(() => {
            expect(result.current.isPending).toBe(true);
        });

        resolveMutation({ success: true });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.isPending).toBe(false);
    });

    test("saves location with all fields", async () => {
      const mockResponse = { success: true };
      mockApiClient.json.mockResolvedValueOnce(mockResponse);

      const { result } = renderHook(() => useSaveToHistory("user-789"), {
        wrapper: createWrapper(),
      });

      const completeLocation = {
        name: "Engineering Building",
        address: "1515 St. Catherine W",
        lat: 45.495,
        lng: -73.577,
        building_code: "EV",
        destinationType: "building",
      };

      await waitFor(() => {
        result.current.mutate(completeLocation);
      });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(mockApiClient.post).toHaveBeenCalledWith(completeLocation);
    });
  });
});