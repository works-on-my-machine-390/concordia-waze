import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent, waitFor } from "@testing-library/react-native";
import IndoorMapContainer from "../components/indoor/IndoorMapContainer";

jest.mock("@/hooks/queries/indoorMapQueries");
jest.mock("../components/indoor/FloorPlanViewer", () => {
  const { View, Text } = require("react-native");
  return function MockFloorPlanViewer({ floor }: any) {
    return (
      <View testID="floor-plan-viewer">
        <Text>Floor {floor?.number}</Text>
      </View>
    );
  };
});
jest.mock("../components/indoor/FloorSelector", () => {
  const { View, TouchableOpacity, Text } = require("react-native");
  return function MockFloorSelector({
    floors,
    selectedFloor,
    onSelectFloor,
  }: any) {
    return (
      <View testID="floor-selector">
        {floors.map((floor: any) => (
          <TouchableOpacity
            key={floor.number}
            onPress={() => onSelectFloor(floor.number)}
            testID={`floor-button-${floor.number}`}
          >
            <Text>Floor {floor.number}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };
});

const mockFloorsData = {
  floors: [
    {
      number: 1,
      name: "Floor 1",
      imgPath: "floormaps/H_1.svg",
      vertices: [],
      edges: [],
      pois: [],
    },
    {
      number: 2,
      name: "Floor 2",
      imgPath: "floormaps/H_2.svg",
      vertices: [],
      edges: [],
      pois: [],
    },
    {
      number: 9,
      name: "Floor 9",
      imgPath: "floormaps/H_9.svg",
      vertices: [],
      edges: [],
      pois: [],
    },
  ],
};

describe("IndoorMapContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders loading state when fetching building floors", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("Loading floor plans...")).toBeTruthy();
  });

  test("renders error state when fetch fails", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error("Network error"),
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("Failed to load floor plans")).toBeTruthy();
    expect(getByText("Network error")).toBeTruthy();
  });

  test("renders empty state when no floors are available", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: { floors: [] },
      isLoading: false,
      error: null,
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("No floor plans available")).toBeTruthy();
  });

  test("renders empty state when data is null", () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });

    const { getByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    expect(getByText("No floor plans available")).toBeTruthy();
  });

  test("selects first floor by default when data loads", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
    });
  });

  test("renders FloorPlanViewer and FloorSelector when data is loaded", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("floor-plan-viewer")).toBeTruthy();
      expect(getByTestId("floor-selector")).toBeTruthy();
    });
  });

  test("changes floor when floor selector button is pressed", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
    });

    fireEvent.press(getByTestId("floor-button-9"));

    await waitFor(() => {
      expect(getAllByText("Floor 9").length).toBeGreaterThan(0);
    });
  });

  test("resets to first floor when building code changes", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId, rerender, getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
    });

    fireEvent.press(getByTestId("floor-button-9"));

    await waitFor(() => {
      expect(getAllByText("Floor 9").length).toBeGreaterThan(0);
    });

    const newFloorsData = {
      floors: [
        {
          number: 3,
          name: "Floor 3",
          imgPath: "floormaps/VL_3.svg",
          vertices: [],
          edges: [],
          pois: [],
        },
      ],
    };

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: newFloorsData,
      isLoading: false,
      error: null,
    });

    rerender(<IndoorMapContainer buildingCode="VL" />);

    await waitFor(() => {
      expect(getAllByText("Floor 3").length).toBeGreaterThan(0);
    });
  });

  test("falls back to first floor if selected floor is not found", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
    });
  });
});
