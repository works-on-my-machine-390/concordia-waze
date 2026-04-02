import { render, screen, fireEvent } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import PoiFilterBottomSheet from "../components/indoor/PoiFilterBottomSheet";
import type { Floor } from "@/hooks/queries/indoorMapQueries";

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
}));

jest.mock("@/app/icons", () => ({
  CloseIcon: () => {
    const { Text } = require("react-native");
    return <Text>Close</Text>;
  },
}));

jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
  BottomSheetScrollView: ({ children }: any) => {
    const { ScrollView } = require("react-native");
    return <ScrollView>{children}</ScrollView>;
  },
}));

const mockSetFilteredPois = jest.fn();
let mockFilteredPois: any[] | null = null;
let mockSelectedPoiFilter: { type: string; label: string } | null = null;

jest.mock("@/hooks/useIndoorSearchStore", () => ({
  useIndoorSearchStore: jest.fn((selector: any) => {
    const state = {
      filteredPois: mockFilteredPois,
      selectedPoiFilter: mockSelectedPoiFilter,
      setFilteredPois: mockSetFilteredPois,
    };

    return selector ? selector(state) : state;
  }),
}));

describe("PoiFilterBottomSheet", () => {
  const mockOnClose = jest.fn();

  const mockFloors: Floor[] = [
    {
      number: 1,
      pois: [
        { name: "poi_1", type: "bathroom" },
        { name: "poi_2", type: "bathroom" },
        { name: "210", type: "room" },
      ],
    },
    {
      number: 2,
      pois: [
        { name: "poi_3", type: "bathroom" },
        { name: "220", type: "room" },
      ],
    },
  ] as Floor[];

  beforeEach(() => {
    jest.clearAllMocks();
    mockFilteredPois = null;
    mockSelectedPoiFilter = null;
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedFloor: "1",
    });
  });

  test("renders header label", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Bathrooms")).toBeOnTheScreen();
  });

  test("calls onClose when close button is pressed", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    fireEvent.press(screen.getByText("Close").parent as any);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test("filters POIs for selected floor and type", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    expect(mockSetFilteredPois).toHaveBeenCalledWith([
      expect.objectContaining({ name: "poi_1", type: "bathroom" }),
      expect.objectContaining({ name: "poi_2", type: "bathroom" }),
    ]);
  });

  test("supports case-insensitive POI type filtering", () => {
    render(
      <PoiFilterBottomSheet
        poiType="BATHROOM"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    expect(mockSetFilteredPois).toHaveBeenCalledWith([
      expect.objectContaining({ name: "poi_1", type: "bathroom" }),
      expect.objectContaining({ name: "poi_2", type: "bathroom" }),
    ]);
  });

  test("sets null when selected floor does not exist", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({
      selectedFloor: "999",
    });

    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    expect(mockSetFilteredPois).toHaveBeenCalledWith(null);
  });

  test("renders count from filteredPois in store", () => {
    mockFilteredPois = [
      { name: "poi_1", type: "bathroom" },
      { name: "poi_2", type: "bathroom" },
      { name: "poi_3", type: "bathroom" },
    ];

    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.getByText("There are 3 bathrooms available on this floor."),
    ).toBeOnTheScreen();
  });
});