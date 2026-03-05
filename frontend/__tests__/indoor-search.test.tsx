import { render, screen, fireEvent } from "@testing-library/react-native";
import IndoorSearchPage from "../app/indoor-search";
import * as ExpoRouter from "expo-router";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearch } from "@/hooks/useIndoorSearch";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock("@/hooks/queries/indoorMapQueries");
jest.mock("@/hooks/useIndoorSearch");

const mockSetSelectedPoiFilter = jest.fn();
jest.mock("@/hooks/useIndoorSearchStore", () => ({
  useIndoorSearchStore: {
    getState: jest.fn(() => ({
      setSelectedPoiFilter: mockSetSelectedPoiFilter,
    })),
  },
}));

jest.mock("@/components/indoor/IndoorPoiFilters", () => {
  return jest.fn(({ onFilterPress }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text>POI Filters</Text>
        <Pressable onPress={() => onFilterPress("bathroom", "Bathrooms")}>
          <Text>Bathrooms Filter</Text>
        </Pressable>
      </View>
    );
  });
});

jest.mock("@/components/indoor/IndoorRecentSearches", () => {
  return jest.fn(({ searches, onSearchPress, onClearPress }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text>Recent Searches</Text>
        {searches.map((search: any, index: number) => (
          <Pressable
            key={index}
            onPress={() => onSearchPress(search.displayName)}
          >
            <Text>Recent: {search.displayName}</Text>
          </Pressable>
        ))}
        <Pressable onPress={onClearPress}>
          <Text>Clear Recent</Text>
        </Pressable>
      </View>
    );
  });
});

jest.mock("@/components/indoor/IndoorSearchResults", () => {
  return jest.fn(({ results, onResultSelect }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text>Search Results</Text>
        {results.map((result: any, index: number) => (
          <Pressable
            key={index}
            onPress={() =>
              onResultSelect(
                result.poi.name,
                result.floor.number,
                result.poi.name,
              )
            }
          >
            <Text>Result: {result.poi.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  });
});

jest.mock("@/components/shared/SearchPill", () => {
  return jest.fn(({ value, onChangeText, onClear, placeholder }) => {
    const { View, TextInput, Text, Pressable } = require("react-native");
    return (
      <View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
        />
        <Pressable onPress={onClear}>
          <Text>Clear Search</Text>
        </Pressable>
      </View>
    );
  });
});

describe("IndoorSearchPage", () => {
  const mockRouter = {
    navigate: jest.fn(),
    back: jest.fn(),
    push: jest.fn(),
  };

  const mockFloors = [
    {
      number: 1,
      pois: [
        { name: "210", type: "room" },
        { name: "poi_1", type: "bathroom" },
      ],
    },
    {
      number: 2,
      pois: [{ name: "220", type: "room" }],
    },
  ];

  const mockSearchResults = [
    {
      poi: { name: "210", type: "room" },
      floor: { number: 1 },
      type: "room",
    },
  ];

  const mockRecentSearches = [
    { displayName: "MB210", floor: 1 },
    { displayName: "MB220", floor: 2 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    (ExpoRouter.useRouter as jest.Mock).mockReturnValue(mockRouter);
    (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
      buildingCode: "MB",
      buildingName: "John Molson Building",
    });
    (ExpoRouter.useFocusEffect as jest.Mock).mockImplementation(() => {});

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: { floors: mockFloors },
      isLoading: false,
    });

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: [],
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });
  });
  test("renders search page with header", () => {
    render(<IndoorSearchPage />);

    expect(
      screen.getByPlaceholderText("Search in John Molson Building..."),
    ).toBeOnTheScreen();
  });

  test("renders POI filters when search is empty", () => {
    render(<IndoorSearchPage />);

    expect(screen.getByText("POI Filters")).toBeOnTheScreen();
  });

  test("renders recent searches when query is empty", () => {
    render(<IndoorSearchPage />);

    expect(screen.getByText("Recent Searches")).toBeOnTheScreen();
    expect(screen.getByText("Recent: MB210")).toBeOnTheScreen();
    expect(screen.getByText("Recent: MB220")).toBeOnTheScreen();
  });

  test("calls clearRecentSearches when clear button is pressed", () => {
    const mockClearRecentSearches = jest.fn();

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: [],
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: mockClearRecentSearches,
    });

    render(<IndoorSearchPage />);

    fireEvent.press(screen.getByText("Clear Recent"));

    expect(mockClearRecentSearches).toHaveBeenCalled();
  });

  test("shows empty state when no recent searches and query is empty", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: [],
      recentSearches: [],
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    expect(screen.getByText("Start typing to search")).toBeOnTheScreen();
  });

  test("clears search when clear button is pressed", () => {
    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search in John Molson Building...",
    );
    fireEvent.changeText(input, "test");

    fireEvent.press(screen.getByText("Clear Search"));

    expect(input.props.value).toBe("");
  });

  test("renders search results when query is not empty", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search in John Molson Building...",
    );

    fireEvent.changeText(input, "210");

    expect(screen.getByText("Search Results")).toBeOnTheScreen();
    expect(screen.getByText("Result: 210")).toBeOnTheScreen();
  });

  test("navigates to indoor map and adds recent search when room result is selected", () => {
    const mockAddRecentSearch = jest.fn();

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: mockAddRecentSearch,
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search in John Molson Building...",
    );

    fireEvent.changeText(input, "210");

    fireEvent.press(screen.getByText("Result: 210"));

    expect(mockAddRecentSearch).toHaveBeenCalledWith("210", "210", 1);

    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "MB",
        selectedRoom: "210",
        selectedFloor: "1",
      },
    });
  });

  test("does not add recent search when selected POI is not a room", () => {
    const nonRoomResults = [
      {
        poi: { name: "poi_1", type: "bathroom" },
        floor: { number: 1 },
        type: "bathroom",
      },
    ];

    const mockAddRecentSearch = jest.fn();

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: nonRoomResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: mockAddRecentSearch,
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search in John Molson Building...",
    );

    fireEvent.changeText(input, "poi_1");

    fireEvent.press(screen.getByText("Result: poi_1"));

    expect(mockAddRecentSearch).not.toHaveBeenCalled();

    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "MB",
        selectedRoom: "poi_1",
        selectedFloor: "1",
      },
    });
  });
});
