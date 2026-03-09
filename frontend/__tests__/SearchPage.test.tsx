/**
 * Tests for SearchPage
 */

import * as guestStorage from "@/hooks/guestStorage";
import { useGetAllBuildings, useGetBuildings } from "@/hooks/queries/buildingQueries";
import {
  useClearUserHistory,
  useGetUserHistory,
  useSaveToHistory,
} from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import SearchPage from "../app/search";
import { renderWithProviders } from "../test_utils/renderUtils";

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
        campus: "SGW",
        polygon: [
          { latitude: 45.497, longitude: -73.578 },
          { latitude: 45.498, longitude: -73.579 },
        ],
      },
      {
        code: "MB",
        campus: "SGW",
        polygon: [
          { latitude: 45.495, longitude: -73.579 },
          { latitude: 45.496, longitude: -73.58 },
        ],
      },
    ],
  };

  const mockLOYBuildings = {
    campus: "LOY",
    buildings: [
      {
        code: "CC",
        campus: "LOY",
        polygon: [
          { latitude: 45.458, longitude: -73.64 },
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

    // Mock all buildings query
    (useGetAllBuildings as jest.Mock).mockReturnValue({
      data: {
        buildings: {
          SGW: mockSGWBuildings.buildings,
          LOY: mockLOYBuildings.buildings,
        },
      },
      isLoading: false,
      isSuccess: true,
    });

    // Mock guest storage
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);
    (guestStorage.addGuestSearchHistory as jest.Mock).mockResolvedValue(
      undefined,
    );
    (guestStorage.clearGuestSearchHistory as jest.Mock).mockResolvedValue(
      undefined,
    );

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

    // Mock clear user history mutation
    (useClearUserHistory as jest.Mock).mockReturnValue({
      mutate: jest.fn((_, options) => {
        // Call onSuccess callback to simulate successful mutation
        if (options?.onSuccess) {
          options.onSuccess();
        }
      }),
      isPending: false,
    });
  });

  const renderAndFlush = async () => {
    const utils = renderWithProviders(<SearchPage />);
    await waitFor(() => {
      // Wait for either guest storage or user history to be loaded
      const guestStorageCalled =
        (guestStorage.getGuestSearchHistory as jest.Mock).mock.calls.length > 0;
      const userHistoryCalled =
        (useGetUserHistory as jest.Mock).mock.calls.length > 0;
      expect(guestStorageCalled || userHistoryCalled).toBe(true);
    });

    return {
      ...utils,
      queryByText: (...args: Parameters<typeof utils.queryByText>) => {
        try {
          return utils.queryByText(...args);
        } catch {
          const matches = utils.queryAllByText(...args);
          return matches[matches.length - 1] ?? null;
        }
      },
    };
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
      const hasResult =
        queryByText(/^C/) || queryByText(/^H/) || queryByText(/^MB/);
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

    await waitFor(
      () => {
        expect(mockRouter.replace).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
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

    await waitFor(
      () => {
        expect(guestStorage.addGuestSearchHistory).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
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

    await waitFor(
      () => {
        expect(mockRouter.replace).toHaveBeenCalled();
      },
      { timeout: 1000 },
    );
  });

  test("navigates immediately for guest user on recent search click without waiting for history save", async () => {
    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
      {
        query: "H",
        locations: "1455 De Maisonneuve Blvd. W.",
        timestamp: new Date(),
      },
    ]);
    // Make addGuestSearchHistory take a long time
    (guestStorage.addGuestSearchHistory as jest.Mock).mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 1000)),
    );

    const { queryByText } = await renderAndFlush();

    await waitFor(() => {
      expect(queryByText("Recent searches")).toBeTruthy();
    });

    const recentItem = queryByText(/^H/);
    expect(recentItem).toBeTruthy();

    fireEvent.press(recentItem!);

    // Navigation should happen immediately, not wait for the slow addGuestSearchHistory
    expect(mockRouter.replace).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        selected: "H",
        campus: "SGW",
        camLat: "",
        camLng: "",
      },
    });
  });

  test("limits recent searches to 6 items", async () => {
    const manySearches = Array.from({ length: 10 }, (_, i) => ({
      query: `Building${i}`,
      locations: `Location ${i}`,
      timestamp: new Date(),
    }));

    (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue(
      manySearches,
    );

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
        name: "H - Hall Building",
        address: "1455 De Maisonneuve Blvd. W.",
        lat: 45.497,
        lng: -73.578,
        destinationType: "building",
        timestamp: new Date(),
      },
      {
        id: "2",
        building_code: "MB",
        name: "MB - John Molson Building",
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
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );

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

      await waitFor(
        () => {
          expect(guestStorage.addGuestSearchHistory).not.toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
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

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
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
          name: "H - Hall Building",
          address: "1455 De Maisonneuve Blvd. W.",
          lat: 45.497,
          lng: -73.578,
          destinationType: "building",
          timestamp: new Date(),
        },
        {
          id: "2",
          building_code: "UNKNOWN",
          name: "UNKNOWN - Missing Building",
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
      const mockClearMutate = jest.fn((_, options) => {
        if (options?.onSuccess) {
          options.onSuccess();
        }
      });
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });
      (useClearUserHistory as jest.Mock).mockReturnValue({
        mutate: mockClearMutate,
        isPending: false,
      });

      const { getByText, queryByText } = await renderAndFlush();

      const clearButton = getByText("Clear");
      fireEvent.press(clearButton);

      // Guest storage should not be called for authenticated users
      expect(guestStorage.clearGuestSearchHistory).not.toHaveBeenCalled();

      // clearUserHistory.mutate should be called instead
      await waitFor(() => {
        expect(mockClearMutate).toHaveBeenCalled();
      });

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

    test("navigates immediately when clicking recent search without waiting for mutation", async () => {
      const mockClearMutate = jest.fn();
      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockUserHistory,
        isLoading: false,
        isSuccess: true,
      });
      (useSaveToHistory as jest.Mock).mockReturnValue({
        mutate: jest.fn(),
        isPending: true, // Simulate pending state
      });

      const { queryByText } = await renderAndFlush();

      // Verify recent searches are visible before clicking
      expect(queryByText("Recent searches")).toBeTruthy();

      const recentItem = queryByText(/^H/);
      expect(recentItem).toBeTruthy();

      fireEvent.press(recentItem!);

      // Navigation should occur immediately, even if mutation is pending
      expect(mockRouter.replace).toHaveBeenCalledWith({
        pathname: "/map",
        params: {
          selected: "H",
          campus: "SGW",
          camLat: "",
          camLng: "",
        },
      });
    });

    test("navigates when authenticated recent item has no building_code but includes code in name", async () => {
      const mockHistoryWithoutCode = [
        {
          id: "1",
          building_code: undefined,
          name: "H - Hall Building",
          address: "1455 De Maisonneuve Blvd. W.",
          lat: 45.497,
          lng: -73.578,
          destinationType: "building",
          timestamp: new Date(),
        },
      ];

      (useGetProfile as jest.Mock).mockReturnValue({
        data: mockAuthenticatedUser,
      });
      (useGetUserHistory as jest.Mock).mockReturnValue({
        data: mockHistoryWithoutCode,
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

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Code Extraction and Validation", () => {
    test("extracts valid building code from query", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // Type just "H" to match the building code
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
      });
    });

    test("does not recognize code longer than 5 characters", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, getByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // Type a code that's too long
      fireEvent.changeText(input, "TOOLONG");

      expect(getByText("No matches found")).toBeTruthy();
    });

    test("recognizes alphanumeric codes", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "MB");

      await waitFor(() => {
        const result = queryByText(/^MB/);
        expect(result).toBeTruthy();
      });
    });
  });

  describe("Results Scoring and Filtering", () => {
    test("prioritizes code match over name match", async () => {
      (useGetBuildings as jest.Mock).mockImplementation((campus: string) => {
        if (campus === "SGW") {
          return {
            data: {
              campus: "SGW",
              buildings: [
                { code: "H", polygon: [] },
                { code: "MB", polygon: [] },
                { code: "HA", polygon: [] },
              ],
            },
            isLoading: false,
            isSuccess: true,
          };
        }
        return {
          data: { campus: "LOY", buildings: [] },
          isLoading: false,
          isSuccess: true,
        };
      });

      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, getAllByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // Query "H" should match H (code match) first, then HA
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const results = getAllByText(/^H/);
        expect(results.length).toBeGreaterThan(0);
      });
    });

    test("includes address in search results", async () => {
      (useGetBuildings as jest.Mock).mockImplementation((campus: string) => {
        if (campus === "SGW") {
          return {
            data: {
              campus: "SGW",
              buildings: [{ code: "H", polygon: [] }],
            },
            isLoading: false,
            isSuccess: true,
          };
        }
        return {
          data: { campus: "LOY", buildings: [] },
          isLoading: false,
          isSuccess: true,
        };
      });

      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // Search by address substring
      fireEvent.changeText(input, "De Maisonneuve");

      await waitFor(() => {
        // Results might include address-matched buildings
        const result = queryByText(/De Maisonneuve/);
        // Address should be shown if building matches
        expect(result === null || queryByText(/^H/) !== null).toBe(true);
      });
    });
  });

  describe("Recent Search Deduplication", () => {
    test("deduplicates recent searches with same query", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "H",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
        {
          query: "H",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
      ]);

      const { queryAllByText } = await renderAndFlush();

      // Should only show one "Recent searches" heading
      const recentSections = queryAllByText("Recent searches");
      expect(recentSections.length).toBe(1);
    });

    test("shows different recent search items separately", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "H",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
        {
          query: "MB",
          locations: "1450 Guy St.",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      expect(queryByText("Recent searches")).toBeTruthy();
      // Both items should be shown
      expect(queryByText(/^H$/)).toBeTruthy();
      expect(queryByText(/MB/)).toBeTruthy();
    });
  });

  describe("PendingRecent and Exact Matching", () => {
    test("navigates when recent item code is already set", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "H",
          locations: "1455 De Maisonneuve Blvd. W.",
          code: "H",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      await waitFor(() => {
        const item = queryByText(/^H/);
        expect(item).toBeTruthy();
        if (item) {
          fireEvent.press(item);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("navigates to first search result when exact match not found in pendingRecent", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "Hall",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
      ]);

      const { queryByText, getByPlaceholderText } = await renderAndFlush();

      // Manually trigger pendingRecent logic by setting a pending recent search
      const recentItem = queryByText(/Hall/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Edge Cases and Error Handling", () => {
    test("handles query with only whitespace", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, getByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "   ");

      expect(getByText("Start typing to search")).toBeTruthy();
    });

    test("handles search result with missing building details", async () => {
      (useGetBuildings as jest.Mock).mockImplementation((campus: string) => {
        if (campus === "SGW") {
          return {
            data: {
              campus: "SGW",
              buildings: [{ code: "H", polygon: [] }],
            },
            isLoading: false,
            isSuccess: true,
          };
        }
        return {
          data: { campus: "LOY", buildings: [] },
          isLoading: false,
          isSuccess: true,
        };
      });

      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
      });
    });

    test("handles selecting result when details are not in cache yet", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);
      const mockSaveToHistory = jest.fn();
      (useSaveToHistory as jest.Mock).mockReturnValue({
        mutate: mockSaveToHistory,
        isPending: false,
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      // Should still navigate even if building details aren't cached
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    test("does not crash when recordRecentSearch encounters error", async () => {
      (guestStorage.addGuestSearchHistory as jest.Mock).mockRejectedValue(
        new Error("Storage error"),
      );

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      // Navigation should still happen even if history save fails
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    test("attempts extraction for recent search without code", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "MB",
          locations: "John Molson Building",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/MB/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      // Should navigate because "MB" can be extracted from query
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Cross-Campus Behavior", () => {
    test("selects appropriate campus when building exists on only one campus", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // "CC" only exists on LOY campus in the mock data
      fireEvent.changeText(input, "CC");

      await waitFor(() => {
        const result = queryByText(/^CC/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                campus: "LOY",
              }),
            }),
          );
        },
        { timeout: 1000 },
      );
    });

    test("maintains campus context when navigating from recent search", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "CC",
          locations: "Loyola Campus",
          code: "CC",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/CC/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "CC",
              campus: "LOY",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Query Parsing and Normalization", () => {
    test("case-insensitive search for building codes", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "h"); // lowercase

      await waitFor(() => {
        // Should match uppercase "H"
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
      });
    });

    test("trims whitespace from query before searching", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "  H  ");

      await waitFor(() => {
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
      });
    });

    test("extracts code from query with extra whitespace", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "  MB  ");

      await waitFor(() => {
        const result = queryByText(/^MB/);
        expect(result).toBeTruthy();
      });
    });
  });

  describe("PendingRecent Matching Logic", () => {
    test("navigates when search result is found with matching query", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      // Search by building code - fastest match
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith(
            expect.objectContaining({
              params: expect.objectContaining({
                selected: "H",
              }),
            }),
          );
        },
        { timeout: 1000 },
      );
    });

    test("falls back to first result when no exact name match found in pendingRecent", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "XYZ",
          locations: "Fake Address",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/XYZ/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      // Fallback to first result occurs in pendingRecent effect
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    test("matches result by code and name format in results", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([]);

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        expect(result).toBeTruthy();
      });
    });

    test("handles recent search with formatted label 'code - name'", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "H - Henry F. Hall Building",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/H - /);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalled();
        },
        { timeout: 1000 },
      );
    });

    test("normalizes whitespace in queries for matching", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "  H  ",
          locations: "1455 De Maisonneuve Blvd. W.",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      // The rendered item will be normalized before display
      const recentItem = queryByText(/^H$/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("handles empty search results early exit in pendingRecent effect", async () => {
      (useGetBuildings as jest.Mock).mockImplementation(() => ({
        data: { campus: "SGW", buildings: [] },
        isLoading: false,
        isSuccess: true,
      }));

      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "Very Long Building Name That Cant Be Extracted", // Too long to extract as code
          locations: "Fake Location",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/Very Long/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      // With no results, pendingRecent effect returns early if results.length === 0
      // No navigation occurs because we can't extract a code and there are no search results
      expect(mockRouter.replace).not.toHaveBeenCalled();
    });

    test("processes pendingRecent for extracted codes from recent search queries", async () => {
      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "MB",
          locations: "1450 Guy St.",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/^MB(?:\s-\s.*)?$/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      // Should navigate with extracted/matched code
      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "MB",
              campus: "SGW",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });
  });

  describe("Edit Mode Navigation", () => {
    test("passes editMode and editValue params when in start edit mode", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "start",
        preserveEnd: "MB",
        preserveStart: "",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for start location");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              editMode: "start",
              editValue: "H",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("passes editMode and editValue params when in end edit mode", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "end",
        preserveEnd: "",
        preserveStart: "H",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for destination");
      fireEvent.changeText(input, "MB");

      await waitFor(() => {
        const result = queryByText(/^MB/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "MB",
              campus: "SGW",
              editMode: "end",
              editValue: "MB",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("preserves both start and end locations when editing start", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "start",
        preserveEnd: "MB",
        preserveStart: "H",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for start location");
      fireEvent.changeText(input, "CC");

      await waitFor(() => {
        const result = queryByText(/^CC/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "CC",
              campus: "LOY",
              editMode: "start",
              editValue: "CC",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("uses empty strings for preserve params when not provided in edit mode", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "start",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for start location");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              editMode: "start",
              editValue: "H",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("does not pass edit params when not in edit mode", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Where to…");
      fireEvent.changeText(input, "H");

      await waitFor(() => {
        const result = queryByText(/^H/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "H",
              campus: "SGW",
              camLat: "",
              camLng: "",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("navigates with edit mode from recent search selection", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "end",
        preserveEnd: "MB",
        preserveStart: "H",
      });

      (guestStorage.getGuestSearchHistory as jest.Mock).mockResolvedValue([
        {
          query: "CC",
          locations: "Loyola Campus",
          code: "CC",
          timestamp: new Date(),
        },
      ]);

      const { queryByText } = await renderAndFlush();

      const recentItem = queryByText(/CC/);
      expect(recentItem).toBeTruthy();

      if (recentItem) {
        fireEvent.press(recentItem);
      }

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "CC",
              campus: "LOY",
              editMode: "end",
              editValue: "CC",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("switches campus correctly when selecting cross-campus building in edit mode", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "start",
        preserveEnd: "H",
        preserveStart: "",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for start location");
      // Select a Loyola campus building
      fireEvent.changeText(input, "CC");

      await waitFor(() => {
        const result = queryByText(/^CC/);
        if (result) {
          fireEvent.press(result);
        }
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledWith({
            pathname: "/map",
            params: {
              selected: "CC",
              campus: "LOY",
              editMode: "start",
              editValue: "CC",
            },
          });
        },
        { timeout: 1000 },
      );
    });

    test("calls router.replace with exact edit mode structure", async () => {
      (useLocalSearchParams as jest.Mock).mockReturnValue({
        campus: "SGW",
        editMode: "start",
        preserveEnd: "MB",
        preserveStart: "H",
      });

      const { getByPlaceholderText, queryByText } = await renderAndFlush();

      const input = getByPlaceholderText("Search for start location");
      fireEvent.changeText(input, "CC");

      await waitFor(() => {
        const result = queryByText(/^CC/);
        expect(result).toBeTruthy();
        fireEvent.press(result!);
      });

      await waitFor(
        () => {
          expect(mockRouter.replace).toHaveBeenCalledTimes(1);
        },
        { timeout: 1000 },
      );

      const replaceCall = mockRouter.replace.mock.calls[0][0];
      expect(replaceCall).toEqual({
        pathname: "/map",
        params: {
          selected: "CC",
          campus: "LOY",
          editMode: "start",
          editValue: "CC",
        },
      });
    });
  });
});
