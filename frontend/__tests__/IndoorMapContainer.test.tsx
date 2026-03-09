import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent, waitFor } from "@testing-library/react-native";
import IndoorMapContainer from "../components/indoor/IndoorMapContainer";

jest.mock("@/hooks/queries/indoorMapQueries");

const mockSetCurrentFloor = jest.fn();
const mockSetSelectedRoom = jest.fn();
const mockSetStart = jest.fn();
const mockSetPickMode = jest.fn();
const mockClearRoute = jest.fn();
const mockClearSelectedPoiFilter = jest.fn();

let mockNavState = {
  mode: "BROWSE",
  currentFloor: null as number | null,
  end: null as any,
  start: null as any,
  selectedRoom: null as any,
  setCurrentFloor: mockSetCurrentFloor,
  setSelectedRoom: mockSetSelectedRoom,
  setStart: mockSetStart,
  setPickMode: mockSetPickMode,
  clearRoute: mockClearRoute,
};

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildingDetails: jest.fn(() => ({
    data: { long_name: "Hall Building", metro_accessible: true },
  })),
}));

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn((selector) => selector(mockNavState)),
}));

jest.mock("@/hooks/useIndoorSearchStore", () => ({
  useIndoorSearchStore: jest.fn((selector) =>
    selector({
      clearSelectedPoiFilter: mockClearSelectedPoiFilter,
    }),
  ),
}));

jest.mock("../components/indoor/NoAccessibleRouteNotice", () => {
  const { Text } = require("react-native");
  return function MockNoAccessibleRouteNotice({ visible }: any) {
    return <Text testID="no-accessible-route">{String(visible)}</Text>;
  };
});

jest.mock("../components/indoor/FloorPlanViewer", () => {
  const { View, Text, Pressable } = require("react-native");
  return function MockFloorPlanViewer(props: any) {
    return (
      <View testID="floor-plan-viewer">
        <Text>{`Floor ${props.floor?.number}`}</Text>
        <Text testID="require-accessible">
          {String(props.requireAccessible)}
        </Text>
        <Text testID="route-path">
          {props.routePath ? JSON.stringify(props.routePath) : "no-route"}
        </Text>
        <Text testID="extra-pois">
          {JSON.stringify(props.extraHighlightedPoiNames ?? [])}
        </Text>

        <Pressable
          testID="trigger-accessibility-unavailable"
          onPress={() => props.onAccessibilityRouteUnavailable?.()}
        >
          <Text>trigger</Text>
        </Pressable>

        <Pressable
          testID="trigger-select-poi"
          onPress={() => props.onSelectPoiName?.("Room 201")}
        >
          <Text>select poi</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("../components/indoor/FloorSelector", () => {
  const { View, TouchableOpacity, Text } = require("react-native");
  return function MockFloorSelector({ floors, onSelectFloor }: any) {
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

const floorsWithRoom = {
  floors: [
    {
      number: 1,
      name: "Floor 1",
      imgPath: "floormaps/H_1.svg",
      vertices: [],
      edges: [],
      pois: [
        {
          name: "Room 201",
          type: "room",
          position: { x: 0.4, y: 0.5 },
        },
      ],
    },
  ],
};

describe("IndoorMapContainer", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockNavState = {
      mode: "BROWSE",
      currentFloor: null,
      end: null,
      start: null,
      selectedRoom: null,
      setCurrentFloor: mockSetCurrentFloor,
      setSelectedRoom: mockSetSelectedRoom,
      setStart: mockSetStart,
      setPickMode: mockSetPickMode,
      clearRoute: mockClearRoute,
    };
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

    expect(mockClearSelectedPoiFilter).toHaveBeenCalled();
    expect(mockSetCurrentFloor).toHaveBeenCalledWith(9);
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
    mockNavState.currentFloor = 999;

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

  test("uses selectedFloorFromSearch in browse mode", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" selectedFloorFromSearch={9} />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 9").length).toBeGreaterThan(0);
    });
  });

  test("uses preferredFloorNumber when provided", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" preferredFloorNumber={2} />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 2").length).toBeGreaterThan(0);
    });
  });

  test("uses nav current floor when valid", async () => {
    mockNavState.currentFloor = 2;

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getAllByText } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" preferredFloorNumber={9} />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 2").length).toBeGreaterThan(0);
    });
  });

  test("passes extra highlighted POIs for current floor transition targets", async () => {
    const floorsWithPois = {
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
          pois: [
            {
              name: "Stairs A",
              type: "stairs",
              position: { x: 0.2, y: 0.2 },
            },
            {
              name: "Elevator A",
              type: "elevator",
              position: { x: 0.9, y: 0.9 },
            },
          ],
        },
      ],
    };

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithPois,
      isLoading: false,
      error: null,
    });

    const routeSegments = [
      {
        floorNumber: 1,
        distance: 10,
        path: [
          { x: 0.1, y: 0.1 },
          { x: 0.3, y: 0.3 },
        ],
      },
      {
        floorNumber: 2,
        distance: 10,
        path: [
          { x: 0.21, y: 0.19 },
          { x: 0.8, y: 0.8 },
        ],
      },
    ];

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer
        buildingCode="H"
        routeSegments={routeSegments}
        preferredFloorNumber={2}
      />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 2").length).toBeGreaterThan(0);
    });

    expect(getByTestId("extra-pois").props.children).not.toBe("[]");
  });

  test("passes no route when no segment matches current floor", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const routeSegments = [
      {
        floorNumber: 99,
        distance: 10,
        path: [
          { x: 0.1, y: 0.1 },
          { x: 0.3, y: 0.3 },
        ],
      },
    ];

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer
        buildingCode="H"
        routeSegments={routeSegments}
        preferredFloorNumber={1}
      />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 1").length).toBeGreaterThan(0);
    });

    expect(getByTestId("route-path")).toHaveTextContent("no-route");
  });

  test("builds routePathForCurrentFloor when a same-floor segment exists", async () => {
    const floorsWithPois = {
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
          pois: [
            {
              name: "Stairs A",
              type: "stairs",
              position: { x: 0.2, y: 0.2 },
            },
            {
              name: "Elevator A",
              type: "elevator",
              position: { x: 0.9, y: 0.9 },
            },
          ],
        },
      ],
    };

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithPois,
      isLoading: false,
      error: null,
    });

    const routeSegments = [
      {
        floorNumber: 1,
        distance: 10,
        path: [
          { x: 0.1, y: 0.1 },
          { x: 0.3, y: 0.3 },
        ],
      },
      {
        floorNumber: 2,
        distance: 10,
        path: [
          { x: 0.21, y: 0.19 },
          { x: 0.8, y: 0.8 },
        ],
      },
    ];

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer
        buildingCode="H"
        routeSegments={routeSegments}
        preferredFloorNumber={2}
      />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 2").length).toBeGreaterThan(0);
    });

    expect(getByTestId("route-path").props.children).not.toBe("no-route");
  });

  test("passes empty extra highlighted POIs when there are no matching transition POIs", async () => {
    const floorsWithoutMatchingPois = {
      floors: [
        {
          number: 2,
          name: "Floor 2",
          imgPath: "floormaps/H_2.svg",
          vertices: [],
          edges: [],
          pois: [
            {
              name: "Cafe",
              type: "food",
              position: { x: 0.2, y: 0.2 },
            },
          ],
        },
      ],
    };

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithoutMatchingPois,
      isLoading: false,
      error: null,
    });

    const routeSegments = [
      {
        floorNumber: 2,
        distance: 10,
        path: [
          { x: 0.2, y: 0.2 },
          { x: 0.8, y: 0.8 },
        ],
      },
    ];

    const { getByTestId, getAllByText } = renderWithProviders(
      <IndoorMapContainer
        buildingCode="H"
        routeSegments={routeSegments}
        preferredFloorNumber={2}
      />,
    );

    await waitFor(() => {
      expect(getAllByText("Floor 2").length).toBeGreaterThan(0);
    });

    expect(getByTestId("extra-pois").props.children).toBe("[]");
  });

  test("does not show accessibility notice before callback fires", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("no-accessible-route")).toHaveTextContent("false");
    });
  });

  test("shows no accessible route notice when FloorPlanViewer triggers callback", async () => {
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
    });

    fireEvent.press(getByTestId("trigger-accessibility-unavailable"));

    await waitFor(() => {
      expect(getByTestId("no-accessible-route")).toHaveTextContent("true");
    });
  });

  test("passes requireAccessible to FloorPlanViewer", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" requireAccessible={true} />,
    );

    await waitFor(() => {
      expect(getByTestId("require-accessible")).toHaveTextContent("true");
    });
  });

  test("passes requireAccessible false by default", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("require-accessible")).toHaveTextContent("false");
    });
  });

  test("keeps floor selector visible by default", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("floor-selector")).toBeTruthy();
    });
  });

  test("hides floor selector when hideFloorSelector is true", async () => {
    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: mockFloorsData,
      isLoading: false,
      error: null,
    });

    const { queryByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" hideFloorSelector={true} />,
    );

    await waitFor(() => {
      expect(queryByTestId("floor-selector")).toBeNull();
    });
  });

  test("selecting a poi in browse mode sets selected room", async () => {
    mockNavState.mode = "BROWSE";

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithRoom,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("floor-plan-viewer")).toBeTruthy();
    });

    fireEvent.press(getByTestId("trigger-select-poi"));

    expect(mockSetSelectedRoom).toHaveBeenCalledWith({
      label: "Room 201",
      floor: 1,
      coord: { x: 0.4, y: 0.5 },
    });
  });

  test("selecting a poi in itinerary mode sets start, pick mode, and clears route", async () => {
    mockNavState.mode = "ITINERARY";

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithRoom,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" />,
    );

    await waitFor(() => {
      expect(getByTestId("floor-plan-viewer")).toBeTruthy();
    });

    fireEvent.press(getByTestId("trigger-select-poi"));

    expect(mockSetStart).toHaveBeenCalledWith({
      label: "Room 201",
      floor: 1,
      coord: { x: 0.4, y: 0.5 },
    });
    expect(mockSetPickMode).toHaveBeenCalledWith("start");
    expect(mockClearRoute).toHaveBeenCalled();
  });

  test("does nothing on select poi when disablePoiSelection is true", async () => {
    mockNavState.mode = "BROWSE";

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: floorsWithRoom,
      isLoading: false,
      error: null,
    });

    const { getByTestId } = renderWithProviders(
      <IndoorMapContainer buildingCode="H" disablePoiSelection={true} />,
    );

    await waitFor(() => {
      expect(getByTestId("floor-plan-viewer")).toBeTruthy();
    });

    fireEvent.press(getByTestId("trigger-select-poi"));

    expect(mockSetSelectedRoom).not.toHaveBeenCalled();
    expect(mockSetStart).not.toHaveBeenCalled();
    expect(mockSetPickMode).not.toHaveBeenCalled();
    expect(mockClearRoute).not.toHaveBeenCalled();
  });
});