import { render, screen, fireEvent } from "@testing-library/react-native";
import IndoorSearchPage from "../app/indoor-search";
import * as ExpoRouter from "expo-router";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearch } from "@/hooks/useIndoorSearch";
import { useNavigationStore } from "@/hooks/useNavigationStore";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useLocalSearchParams: jest.fn(),
  useFocusEffect: jest.fn(),
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetAllBuildings: jest.fn(() => ({
    data: {
      buildings: {
        SGW: [
          {
            code: "MB",
            latitude: 45.497,
            longitude: -73.579,
            floors: [
              {
                number: 1,
                name: "MB - Floor 1",
                pois: [
                  {
                    name: "210",
                    type: "room",
                    position: { x: 0.1, y: 0.2 },
                    polygon: [],
                  },
                ],
              },
            ],
          },
        ],
        LOY: [],
      },
    },
  })),
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
            onPress={() => onSearchPress(search)}
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
            onPress={() => onResultSelect(result.poi, result.poi.name)}
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
        {
          name: "210",
          type: "room",
          building: "MB",
          floor_number: 1,
          latitude: 45.497,
          longitude: -73.579,
          position: { x: 0.1, y: 0.2 },
        },
      ],
    },
  ];

  const mockSearchResults = [
    {
      poi: {
        name: "210",
        type: "room",
        building: "MB",
        floor_number: 1,
        latitude: 45.497,
        longitude: -73.579,
        position: { x: 0.1, y: 0.2 },
      },
      floor: { number: 1 },
      type: "room",
    },
  ];

  const mockRecentSearches = [{ displayName: "MB210", floor: 1 }];

  beforeEach(() => {
    jest.clearAllMocks();

    useNavigationStore.setState({
      modifyingField: null,
      startLocation: undefined,
      endLocation: undefined,
    });

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

  test("renders search page with placeholder", () => {
    render(<IndoorSearchPage />);

    expect(
      screen.getByPlaceholderText("Search in John Molson Building..."),
    ).toBeOnTheScreen();
  });

  test("renders filters and recent searches when query is empty", () => {
    render(<IndoorSearchPage />);

    expect(screen.getByText("POI Filters")).toBeOnTheScreen();
    expect(screen.getByText("Recent Searches")).toBeOnTheScreen();
    expect(screen.getByText("Recent: MB210")).toBeOnTheScreen();
  });

  test("renders results when query is not empty", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search in John Molson Building..."),
      "210",
    );

    expect(screen.getByText("Search Results")).toBeOnTheScreen();
    expect(screen.getByText("Result: 210")).toBeOnTheScreen();
  });

  test("selecting a result navigates to indoor map in browse mode", () => {
    (useIndoorSearch as jest.Mock).mockReturnValue({
      results: mockSearchResults,
      recentSearches: mockRecentSearches,
      addRecentSearch: jest.fn(),
      clearRecentSearches: jest.fn(),
    });

    render(<IndoorSearchPage />);

    fireEvent.changeText(
      screen.getByPlaceholderText("Search in John Molson Building..."),
      "210",
    );
    fireEvent.press(screen.getByText("Result: 210"));

    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "MB",
        selectedPoiName: "210",
        selectedFloor: "1",
      },
    });
  });

  test("selecting filter saves filter state and navigates", () => {
    render(<IndoorSearchPage />);

    fireEvent.press(screen.getByText("Bathrooms Filter"));

    expect(mockSetSelectedPoiFilter).toHaveBeenCalledWith("bathroom", "Bathrooms");
    expect(mockRouter.navigate).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "MB" },
    });
  });
});
