import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorBottomSheetSection from "../components/indoor/IndoorBottomSheetSection";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";
import { useIndoorSearchStore } from "@/hooks/useIndoorSearchStore";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { useRouter } from "expo-router";

jest.mock("@/hooks/queries/indoorMapQueries");
jest.mock("@/hooks/useIndoorSearchStore");
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("../components/indoor/IndoorFloorBottomSheet", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return function MockIndoorFloorBottomSheet() {
    return (
      <View testID="indoor-floor-bottom-sheet">
        <Text>IndoorFloorBottomSheet</Text>
      </View>
    );
  };
});



jest.mock("../components/indoor/PoiFilterBottomSheet", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return function MockPoiFilterBottomSheet(props: any) {
    return (
      <View testID="poi-filter-bottom-sheet">
        <Text>{props.poiType}</Text>
        <Text>{props.poiLabel}</Text>
        <Pressable
          testID="poi-filter-select"
          onPress={() => props.onPoiSelect("poi_1", 2)}
        >
          <Text>select</Text>
        </Pressable>
        <Pressable testID="poi-filter-close" onPress={props.onClose}>
          <Text>close</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("../components/indoor/IndoorRoomBottomSheet", () => {
  const React = require("react");
  const { View, Text, Pressable } = require("react-native");
  return function MockIndoorRoomBottomSheet(props: any) {
    return (
      <View testID="indoor-room-bottom-sheet">
        <Text>{props.selectedPoi?.name}</Text>
        <Pressable testID="room-close" onPress={props.onClose}>
          <Text>close</Text>
        </Pressable>
      </View>
    );
  };
});

const mockedUseIndoorSearchStore =
  useIndoorSearchStore as unknown as jest.Mock;

describe("IndoorBottomSheetSection", () => {
  const mockPush = jest.fn();
  const mockClearSelectedPoiFilter = jest.fn();
  const mockOnClearSelectedPoi = jest.fn();

  const mockFloor = {
    number: 1,
    name: "Floor 1",
    imgPath: "floor1.svg",
    vertices: [],
    edges: [],
    pois: [
      {
        name: "Room 101",
        type: "room",
        position: { x: 0.5, y: 0.5 },
        polygon: [],
      },
      {
        name: "Bathroom A",
        type: "bathroom",
        position: { x: 0.2, y: 0.2 },
        polygon: [],
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    useMapStore.setState({ currentMode: MapMode.NONE });
    useNavigationStore.setState({ navigationPhase: undefined });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });

    (useGetBuildingFloors as jest.Mock).mockReturnValue({
      data: {
        floors: [mockFloor, { ...mockFloor, number: 2, name: "Floor 2" }],
      },
    });

    mockedUseIndoorSearchStore.mockImplementation((selector: any) =>
      selector({
        selectedPoiFilter: null,
        clearSelectedPoiFilter: mockClearSelectedPoiFilter,
      }),
    );
  });

  it("hides indoor sheets in navigation mode", () => {
    useMapStore.setState({ currentMode: MapMode.NAVIGATION });

    const { queryByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    expect(queryByTestId("indoor-floor-bottom-sheet")).toBeNull();
    expect(queryByTestId("indoor-room-bottom-sheet")).toBeNull();
    expect(queryByTestId("poi-filter-bottom-sheet")).toBeNull();
  });

  it("renders floor bottom sheet when no poi and no filter are selected", () => {
    const { getByTestId, queryByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    expect(getByTestId("indoor-floor-bottom-sheet")).toBeTruthy();
    expect(queryByTestId("indoor-room-bottom-sheet")).toBeNull();
    expect(queryByTestId("poi-filter-bottom-sheet")).toBeNull();
  });

  it("renders room bottom sheet when a poi is selected", () => {
    const { getByTestId, getByText, queryByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        selectedPoiName="Room 101"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    expect(getByTestId("indoor-room-bottom-sheet")).toBeTruthy();
    expect(getByText("Room 101")).toBeTruthy();
    expect(queryByTestId("indoor-floor-bottom-sheet")).toBeNull();
    expect(queryByTestId("poi-filter-bottom-sheet")).toBeNull();
  });

  it("calls onClearSelectedPoi when room sheet closes", () => {
    const { getByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        selectedPoiName="Room 101"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    fireEvent.press(getByTestId("room-close"));
    expect(mockOnClearSelectedPoi).toHaveBeenCalled();
  });

  it("renders poi filter sheet when a poi filter is selected", () => {
     mockedUseIndoorSearchStore.mockImplementation((selector: any) =>
      selector({
        selectedPoiFilter: { type: "bathroom", label: "Bathrooms" },
        clearSelectedPoiFilter: mockClearSelectedPoiFilter,
      }),
    );

    const { getByTestId, getByText, queryByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    expect(getByTestId("poi-filter-bottom-sheet")).toBeTruthy();
    expect(getByText("bathroom")).toBeTruthy();
    expect(getByText("Bathrooms")).toBeTruthy();
    expect(queryByTestId("indoor-floor-bottom-sheet")).toBeNull();
    expect(queryByTestId("indoor-room-bottom-sheet")).toBeNull();
  });

  it("navigates to indoor map when poi filter selection is made", () => {
     mockedUseIndoorSearchStore.mockImplementation((selector: any) =>
      selector({
        selectedPoiFilter: { type: "bathroom", label: "Bathrooms" },
        clearSelectedPoiFilter: mockClearSelectedPoiFilter,
      }),
    );

    const { getByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    fireEvent.press(getByTestId("poi-filter-select"));

    expect(mockClearSelectedPoiFilter).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "H",
        selectedRoom: "poi_1",
        selectedFloor: "2",
      },
    });
  });

  it("clears poi filter when filter sheet closes", () => {
    mockedUseIndoorSearchStore.mockImplementation((selector: any) =>
      selector({
        selectedPoiFilter: { type: "bathroom", label: "Bathrooms" },
        clearSelectedPoiFilter: mockClearSelectedPoiFilter,
      }),
    );

    const { getByTestId } = render(
      <IndoorBottomSheetSection
        floor={mockFloor as any}
        buildingCode="H"
        buildingName="Hall"
        onClearSelectedPoi={mockOnClearSelectedPoi}
      />,
    );

    fireEvent.press(getByTestId("poi-filter-close"));
    expect(mockClearSelectedPoiFilter).toHaveBeenCalled();
  });

});