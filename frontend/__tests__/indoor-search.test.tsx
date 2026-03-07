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

const mockSetStart = jest.fn();
const mockSetEnd = jest.fn();
const mockSetCurrentFloor = jest.fn();

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn((selector) =>
    selector({
      setStart: mockSetStart,
      setEnd: mockSetEnd,
      setCurrentFloor: mockSetCurrentFloor,
    }),
  ),
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
            key={`${search.displayName}-${search.floor}-${index}`}
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
            key={`${result.poi.name}-${result.floor.number}-${index}`}
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
        { name: "210", type: "room", position: { x: 0.1, y: 0.2 } },
        { name: "poi_1", type: "bathroom", position: { x: 0.3, y: 0.4 } },
      ],
    },
    {
      number: 2,
      pois: [{ name: "220", type: "room", position: { x: 0.5, y: 0.6 } }],
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

  test("shows loading spinner while floors are loading", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    render(<IndoorSearchPage />);

    expect(
      screen.UNSAFE_getByType(require("react-native").ActivityIndicator),
    ).toBeTruthy();
  });

  test("sets itinerary start point and goes back when selecting a result", () => {
    (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
      buildingCode: "MB",
      buildingName: "John Molson Building",
      itineraryField: "start",
    });

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Choose start in John Molson Building...",
    );

    fireEvent.changeText(input, "210");
    fireEvent.press(screen.getByText("Result: 210"));

    expect(mockSetStart).toHaveBeenCalled();
    expect(mockSetCurrentFloor).toHaveBeenCalledWith(1);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("sets itinerary end point and goes back when selecting a result", () => {
    (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
      buildingCode: "MB",
      buildingName: "John Molson Building",
      itineraryField: "end",
    });

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Choose destination in John Molson Building...",
    );

    fireEvent.changeText(input, "210");
    fireEvent.press(screen.getByText("Result: 210"));

    expect(mockSetEnd).toHaveBeenCalled();
    expect(mockSetCurrentFloor).toHaveBeenCalledWith(1);
    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("navigates back when back button is pressed", () => {
    render(<IndoorSearchPage />);

    fireEvent.press(screen.getByTestId("indoor-search-back-button"));

    expect(mockRouter.back).toHaveBeenCalled();
  });

  test("applies filter and navigates to indoor map", () => {
    render(<IndoorSearchPage />);

    fireEvent.press(screen.getByText("Bathrooms Filter"));

    expect(mockSetSelectedPoiFilter).toHaveBeenCalledWith(
      "bathroom",
      "Bathrooms",
    );
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "MB" },
    });
  });

  test("uses itinerary start placeholder", () => {
    (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
      buildingCode: "MB",
      buildingName: "John Molson Building",
      itineraryField: "start",
    });

    render(<IndoorSearchPage />);

    expect(
      screen.getByPlaceholderText("Choose start in John Molson Building..."),
    ).toBeOnTheScreen();
  });

  test("uses itinerary end placeholder", () => {
    (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
      buildingCode: "MB",
      buildingName: "John Molson Building",
      itineraryField: "end",
    });

    render(<IndoorSearchPage />);

    expect(
      screen.getByPlaceholderText(
        "Choose destination in John Molson Building...",
      ),
    ).toBeOnTheScreen();
  });

  test("renders missing recent search item", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: [],
      recentSearches: [{ displayName: "Missing Room", floor: 99 }],
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    expect(screen.getByText("Recent: Missing Room")).toBeOnTheScreen();
  });

  test("does nothing when selected result poi is missing", () => {
    const badResults = [
      {
        poi: { name: "999", type: "room" },
        floor: { number: 1 },
        type: "room",
      },
    ];

    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: badResults,
      recentSearches: [],
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    const input = screen.getByPlaceholderText(
      "Search in John Molson Building...",
    );
    fireEvent.changeText(input, "999");
    fireEvent.press(screen.getByText("Result: 999"));

    expect(mockRouter.navigate).not.toHaveBeenCalled();
    expect(mockRouter.back).not.toHaveBeenCalled();
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

  test("renders duplicate recent searches as separate mocked items", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: [],
      recentSearches: [
        { displayName: "MB210", floor: 1 },
        { displayName: "MB210", floor: 1 },
      ],
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    expect(screen.getAllByText("Recent: MB210")).toHaveLength(2);
  });
  test("sets itinerary end point and goes back when selecting a result", () => {
  (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
    buildingCode: "MB",
    buildingName: "John Molson Building",
    itineraryField: "end",
  });

  (useIndoorSearch as jest.Mock).mockReturnValue({
    results: mockSearchResults,
    recentSearches: mockRecentSearches,
    addRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  });

  render(<IndoorSearchPage />);

  const input = screen.getByPlaceholderText(
    "Choose destination in John Molson Building...",
  );

  fireEvent.changeText(input, "210");
  fireEvent.press(screen.getByText("Result: 210"));

  expect(mockSetEnd).toHaveBeenCalled();
  expect(mockSetCurrentFloor).toHaveBeenCalledWith(1);
  expect(mockRouter.back).toHaveBeenCalled();
});

test("does not call setStart or setEnd in normal browse mode when selecting a result", () => {
  (ExpoRouter.useLocalSearchParams as jest.Mock).mockReturnValue({
    buildingCode: "MB",
    buildingName: "John Molson Building",
  });

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
  fireEvent.press(screen.getByText("Result: 210"));

  expect(mockSetStart).not.toHaveBeenCalled();
  expect(mockSetEnd).not.toHaveBeenCalled();
  expect(mockRouter.navigate).toHaveBeenCalledWith({
    pathname: "/indoor-map",
    params: {
      buildingCode: "MB",
      selectedRoom: "210",
      selectedFloor: "1",
    },
  });
});

test("keeps POI filters hidden once a query is typed", () => {
  render(<IndoorSearchPage />);

  const input = screen.getByPlaceholderText(
    "Search in John Molson Building...",
  );

  fireEvent.changeText(input, "210");

  expect(screen.queryByText("POI Filters")).toBeNull();
  expect(screen.queryByText("Recent Searches")).toBeNull();
  expect(screen.getByText("Search Results")).toBeOnTheScreen();
});
test("shows empty results section when query is typed and there are no matches", () => {
  (useIndoorSearch as jest.Mock).mockReturnValue({
    results: [],
    recentSearches: mockRecentSearches,
    addRecentSearch: jest.fn(),
    clearRecentSearches: jest.fn(),
  });

  render(<IndoorSearchPage />);

  const input = screen.getByPlaceholderText(
    "Search in John Molson Building...",
  );

  fireEvent.changeText(input, "zzz");

  expect(screen.queryByText("POI Filters")).toBeNull();
  expect(screen.queryByText("Recent Searches")).toBeNull();
});
});