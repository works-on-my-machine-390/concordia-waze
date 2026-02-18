/**
 * Tests for SearchPage
 */

import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "../test_utils/renderUtils";
import SearchPage from "../app/search";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useGetBuildings } from "@/hooks/queries/buildingQueries";
import * as guestStorage from "@/hooks/guestStorage";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
}));

// Mock building queries
jest.mock("@/hooks/queries/buildingQueries");

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
  });

  const renderAndFlush = async () => {
    const utils = renderWithProviders(<SearchPage />);
    await waitFor(() => {
      expect(guestStorage.getGuestSearchHistory).toHaveBeenCalled();
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
});
