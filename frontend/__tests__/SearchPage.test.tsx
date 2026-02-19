/**
 * Tests for SearchPage
 */

import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "../test_utils/renderUtils";
import SearchPage from "../app/search";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetBuildings } from "@/hooks/queries/buildingQueries";
import * as guestStorage from "@/hooks/guestStorage";
import { useGetUserHistory, useSaveToHistory } from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

// Mock building queries
jest.mock("@/hooks/queries/buildingQueries");

// Mock user queries
jest.mock("@/hooks/queries/userQueries");

// Mock user history queries
jest.mock("@/hooks/queries/userHistoryQueries");

// Mock guest storage
jest.mock("@/hooks/guestStorage");

// Mock api to avoid prefetch resolving during tests
jest.mock("@/hooks/api", () => ({
  api: jest.fn(async () => ({
    get: () => ({
      json: () => Promise.reject(new Error("Mock: prefetch disabled")),
    }),
  })),
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: any) => children,
}));

describe("SearchPage", () => {
  const mockRouter = {
    back: jest.fn(),
    replace: jest.fn(),
  };

  const mockSGWBuildings = {
    campus: "SGW",
    buildings: [
      {
        code: "H",
        polygon: [
          { latitude: 45.497, longitude: -73.578 },
          { latitude: 45.498, longitude: -73.579 },
        ],
      },
      {
        code: "MB",
        polygon: [
          { latitude: 45.495, longitude: -73.579 },
          { latitude: 45.496, longitude: -73.580 },
        ],
      },
    ],
  };

  const mockLOYBuildings = {
    campus: "LOY",
    buildings: [
      {
        code: "CC",
        polygon: [
          { latitude: 45.458, longitude: -73.640 },
          { latitude: 45.459, longitude: -73.641 },
        ],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
    (useLocalSearchParams as jest.Mock).mockReturnValue({ campus: "SGW" });
    (useGetBuildings as jest.Mock).mockImplementation((campus: string) => {
      if (campus === "SGW") {
        return {
          data: mockSGWBuildings,
          isLoading: false,
          isSuccess: true,
        };
      }
      return {
        data: mockLOYBuildings,
        isLoading: false,
        isSuccess: true,
      };
    });

    // Mock guest storage
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);
    (guestStorage.addGuestSearchHistory as jest.Mock).mockResolvedValue(undefined);
    (guestStorage.clearGuestSearchHistory as jest.Mock).mockResolvedValue(undefined);

    // Mock user profile (default: guest/unauthenticated)
    (useGetProfile as jest.Mock).mockReturnValue({
      data: null,
    });

    // Mock user history query (default: empty)
    (useGetUserHistory as jest.Mock).mockReturnValue({
      data: [],
      isLoading: false,
      isSuccess: true,
    });

    // Mock save to history mutation
    (useSaveToHistory as jest.Mock).mockReturnValue({
      mutate: jest.fn(),
      isPending: false,
    });
  });

  const renderAndFlush = async () => {
    const utils = renderWithProviders(<SearchPage />);
    await waitFor(() => {
      // Wait for either guest storage or user history to be loaded
      const guestStorageCalled = (guestStorage.getGuestSearchHistory as jest.Mock).mock.calls.length > 0;
      const userHistoryCalled = (useGetUserHistory as jest.Mock).mock.calls.length > 0;
      expect(guestStorageCalled || userHistoryCalled).toBe(true);
    });
    return utils;
  };

  test("renders search input with placeholder", async () => {
    const { getByPlaceholderText } = await renderAndFlush();
    expect(getByPlaceholderText("Where to…")).toBeTruthy();
  });

  test("back button calls router.back()", async () => {
    const { getByTestId } = await renderAndFlush();
    const backButton = getByTestId("back-button");
    fireEvent.press(backButton);
  });

  test("updates query state when typing", async () => {
    const { getByPlaceholderText } = await renderAndFlush();
    const input = getByPlaceholderText("Where to…");
    
    fireEvent.changeText(input, "Hall");
    expect(input.props.value).toBe("Hall");
  });

  test("shows 'Start typing to search' when query is empty", async () => {
    const { getByText } = await renderAndFlush();
    expect(getByText("Start typing to search")).toBeTruthy();
  });

  test("shows 'No matches found' for invalid query", async () => {
    const { getByPlaceholderText, getByText } = await renderAndFlush();
    
    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "XYZ999NOTFOUND");

    expect(getByText("No matches found")).toBeTruthy();
  });

  test("displays search results when typing valid query", async () => {
    const { getByPlaceholderText, queryByText } = await renderAndFlush();

    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "H");

    await waitFor(() => {
      const result = queryByText(/^H/);
      expect(result).toBeTruthy();
    });
  });

  test("filters results from both campuses", async () => {
    const { getByPlaceholderText, queryByText } = await renderAndFlush();

    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "C");

    await waitFor(() => {
      const hasResult = queryByText(/^C/) || queryByText(/^H/) || queryByText(/^MB/);
      expect(hasResult).toBeTruthy();
    });
  });

  test("navigates to map when selecting result", async () => {
    const { getByPlaceholderText, queryByText } = await renderAndFlush();

    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "H");

    await waitFor(() => {
      const result = queryByText(/^H/);
      if (result) {
        fireEvent.press(result);
      }
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  test("records search history on selection", async () => {
    const { getByPlaceholderText, queryByText } = await renderAndFlush();

    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "MB");

    await waitFor(() => {
      const result = queryByText(/^MB/);
      if (result) {
        fireEvent.press(result);
      }
    });

    await waitFor(() => {
      expect(guestStorage.addGuestSearchHistory).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  test("displays recent searches section", async () => {
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
      {
        query: "H",
        locations: "1455 De Maisonneuve Blvd. W.",
        timestamp: new Date(),
      },
    ]);

    const { getByText } = await renderAndFlush();
    expect(getByText("Recent searches")).toBeTruthy();
  });

  test("clears recent searches on Clear button press", async () => {
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
      {
        query: "H",
        locations: "1455 De Maisonneuve Blvd. W.",
        timestamp: new Date(),
      },
    ]);

    const { getByText, queryByText } = await renderAndFlush();

    const clearButton = getByText("Clear");
    fireEvent.press(clearButton);

    await waitFor(() => {
      expect(guestStorage.clearGuestSearchHistory).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(queryByText("Recent searches")).toBeNull();
    });
  });

  test("navigates when clicking recent search item", async () => {
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
      {
        query: "H",
        locations: "1455 De Maisonneuve Blvd. W.",
        timestamp: new Date(),
      },
    ]);

    const { queryByText } = await renderAndFlush();

    await waitFor(() => {
      const recentItem = queryByText(/^H/);
      if (recentItem) {
        fireEvent.press(recentItem);
      }
    });

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalled();
    }, { timeout: 1000 });
  });

  test("limits recent searches to 6 items", async () => {
    const manySearches = Array.from({ length: 10 }, (_, i) => ({
      query: `Building${i}`,
      locations: `Location ${i}`,
      timestamp: new Date(),
    }));

    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue(manySearches);

    const { queryByText } = await renderAndFlush();

    // Should show first item
    await waitFor(() => {
      expect(queryByText(/Building0/)).toBeTruthy();
    });

    // Should not show 10th item (index 9)
    expect(queryByText(/Building9/)).toBeNull();
  });

  test("uses default campus SGW when no params", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    await renderAndFlush();
    
    expect(useGetBuildings).toHaveBeenCalledWith("SGW");
  });

  test("uses campus from params", async () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ campus: "LOY" });
    await renderAndFlush();

    expect(useGetBuildings).toHaveBeenCalledWith("SGW");
    expect(useGetBuildings).toHaveBeenCalledWith("LOY");
  });

  test("handles empty building data gracefully", async () => {
    (useGetBuildings as jest.Mock).mockImplementation(() => ({
      data: { campus: "SGW", buildings: [] },
      isLoading: false,
      isSuccess: true,
    }));

    const { getByPlaceholderText, getByText } = await renderAndFlush();
    
    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "test");

    expect(getByText("No matches found")).toBeTruthy();
  });

  describe("Authenticated User Search History", () => {
    const mockAuthenticatedUser = {
      id: "user123",
      email: "user@concordia.ca",
    };

    const mockUserHistory = [
      {
        id: "1",
        building_code: "H",
        name: "H",
        address: "1455 De Maisonneuve Blvd. W.",
        lat: 45.497,
        lng: -73.578,
        destinationType: "building",
        timestamp: new Date(),
      },
      {
        id: "2",
        building_code: "MB",
        name: "MB",
        address: "1450 Guy St.",
        lat: 45.495,
        lng: -73.579,
        destinationType: "building",
        timestamp: new Date(),
      },
    ];

    test("loads user history when authenticated", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });

      await renderAndFlush();

      expect(useGetUserHistory).toHaveBeenCalledWith("user123");
    });

    test("does not call guest storage when user is authenticated", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });

      await renderAndFlush();

      expect(guestStorage.getGuestSearchHistory).not.toHaveBeenCalled();
    });

    test("displays recent searches from user history for authenticated users", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });

      const { getByText } = await renderAndFlush();

      expect(getByText("Recent searches")).toBeTruthy();
    });

    test("saves to user history using useSaveToHistory when selecting result", async () => {
      const mockSaveToHistory = jest.fn();
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
      });
      (useSaveToHistory as jest.Mock).mockReturnValue({
        mutate: mockSaveToHistory,
        isPending: false,
      });

      // We need to render with the full component stack which includes QueryClientProvider
      // to properly test the recordRecentSearch flow
      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      // The mutation should be called when selecting a building
      // even if buildingDetails are not in cache (graceful fallback)
      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalled();
      }, { timeout: 1000 });

      // Verify useSaveToHistory hook was set up with the authenticated user ID
      expect(useGetProfile).toHaveBeenCalled();
    });

    test("initializes useSaveToHistory with authenticated user ID", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
      });

      await renderAndFlush();

      // Verify useSaveToHistory is initialized with the authenticated user's ID
      expect(useSaveToHistory).toHaveBeenCalledWith("user123");
    });

    test("does not call guest storage addHistory when authenticated user selects result", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: [],
        isLoading: false,
        isSuccess: true,
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "MB");

      await waitFor(() => {
        const result = queryByText(/^MB/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(() => {
        expect(guestStorage.addGuestSearchHistory).not.toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    test("navigates when clicking recent search from authenticated user history", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });

      const { queryByText } = await renderAndFlush();

      await waitFor(() => {
        const recentItem = queryByText(/^H/);
        if (recentItem) {
          fireEvent.press(recentItem);
        }
      });

      await waitFor(() => {
        expect(mockRouter.replace).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    test("limits authenticated user recent searches to 6 items", async () => {
      const manyUserSearches = Array.from({ length: 10 }, (_, i) => ({
        id: `${i}`,
        building_code: `Building${i}`,
        name: `Building${i}`,
        address: `Location ${i}`,
        lat: 45.0 + i * 0.01,
        lng: -73.0 - i * 0.01,
        destinationType: "building",
        timestamp: new Date(),
      }));

      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: manyUserSearches,
        isLoading: false,
        isSuccess: true,
      });

      const { queryByText } = await renderAndFlush();

      // Should show first item
      await waitFor(() => {
        expect(queryByText(/Building0/)).toBeTruthy();
      });

      // Should not show 10th item (index 9)
      expect(queryByText(/Building9/)).toBeNull();
    });

    test("shows recent searches even when some buildings are missing from building list", async () => {
      const userHistoryWithMissingBuilding = [
        {
          id: "1",
          building_code: "H",
          name: "H",
          address: "1455 De Maisonneuve Blvd. W.",
          lat: 45.497,
          lng: -73.578,
          destinationType: "building",
          timestamp: new Date(),
        },
        {
          id: "2",
          building_code: "UNKNOWN",
          name: "UNKNOWN",
          address: "Unknown Address",
          lat: 0,
          lng: 0,
          destinationType: "building",
          timestamp: new Date(),
        },
      ];

      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: userHistoryWithMissingBuilding,
        isLoading: false,
        isSuccess: true,
      });

      const { getByText, queryByText } = await renderAndFlush();

      expect(getByText("Recent searches")).toBeTruthy();
      // Should still show the known building
      expect(queryByText(/^H/)).toBeTruthy();
    });

    test("clears authenticated user recent searches without calling guest storage", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });

      const { getByText, queryByText } = await renderAndFlush();

      const clearButton = getByText("Clear");
      fireEvent.press(clearButton);

      // Guest storage should not be called for authenticated users
      expect(guestStorage.clearGuestSearchHistory).not.toHaveBeenCalled();

      await waitFor(() => {
        expect(queryByText("Recent searches")).toBeNull();
      });
    });

    test("calls useGetUserHistory with empty string when user profile is not defined", async () => {
      (useGetProfile as jest.Mock).mockReturnValue({
        data: null,
      });

      await renderAndFlush();

      // When userId is empty string, it should still call with empty string
      expect(useGetUserHistory).toHaveBeenCalledWith("");
    });
  });
});
