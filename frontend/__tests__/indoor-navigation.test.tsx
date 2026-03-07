import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorNavigationPage from "@/app/indoor-navigation";

const mockReplace = jest.fn();

const mockState = {
  routeSegments: [
    {
      floorNumber: 2,
      distance: 10,
      path: [
        { x: 0.1, y: 0.2 },
        { x: 0.4, y: 0.2 },
      ],
    },
  ],
  transitionType: 1,
  totalDistance: 25,
  start: {
    floor: 2,
    coord: { x: 0.1, y: 0.2 },
  },
  currentFloor: 1 as number | null,
  setCurrentFloor: jest.fn(),
  clearRoute: jest.fn(),
  exitItinerary: jest.fn(),
};

const mockSetSteps = jest.fn();
const mockSetLoadingSteps = jest.fn();
const mockSetCurrentStepIndex = jest.fn();

const mockSteps = [
  {
    id: "step-1",
    floorNumber: 2,
    targetPoint: { x: 0.4, y: 0.2 },
    kind: "walk",
    iconName: "walk",
    instruction: "Head straight",
    distanceMeters: 10,
    remainingDistanceMeters: 10,
  },
  {
    id: "step-2",
    floorNumber: 2,
    targetPoint: { x: 0.4, y: 0.2 },
    kind: "arrival",
    iconName: "location",
    instruction: "You have arrived",
    distanceMeters: 0,
    remainingDistanceMeters: 0,
  },
];

jest.mock("expo-router", () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
  useLocalSearchParams: () => ({
    buildingCode: "VL",
  }),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/app/constants", () => ({
  COLORS: { maroon: "#912338" },
}));

jest.mock("@/hooks/useIndoorNavigationStore", () => ({
  useIndoorNavigationStore: jest.fn((selector: any) => selector(mockState)),
}));

jest.mock("@/hooks/queries/indoorMapQueries", () => ({
  useGetBuildingFloors: jest.fn(() => ({
    data: { floors: [{ number: 2, imgPath: "floor2.svg" }] },
  })),
}));

jest.mock("@/app/utils/indoorNavigationSteps", () => ({
  buildIndoorNavigationSteps: jest.fn(),
}));

jest.mock("@/components/indoor/IndoorMapContainer", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIndoorMapContainer(props: any) {
    return (
      <Text testID="nav-map-container">
        {JSON.stringify({
          buildingCode: props.buildingCode,
          preferredFloorNumber: props.preferredFloorNumber,
          disablePoiSelection: props.disablePoiSelection,
          hideBottomSheetSection: props.hideBottomSheetSection,
          hideFloorSelector: props.hideFloorSelector,
          navigationStepIndex: props.navigationStepIndex,
        })}
      </Text>
    );
  };
});

jest.mock("@/components/indoor/IndoorNavigationInstructionCard", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockInstructionCard({ step }: any) {
    return (
      <Text testID="instruction-card">
        {step ? step.instruction : "no-step"}
      </Text>
    );
  };
});

jest.mock("@/components/indoor/IndoorNavigationBottomSheet", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return function MockBottomSheet(props: any) {
    return (
      <>
        <Text testID="nav-bottom-sheet">
          {JSON.stringify({
            remainingDistanceMeters: props.remainingDistanceMeters,
            currentStepIndex: props.currentStepIndex,
            totalSteps: props.totalSteps,
            isLastStep: props.isLastStep,
            isArrivalStep: props.isArrivalStep,
          })}
        </Text>
        <Pressable testID="next-btn" onPress={props.onNext}>
          <Text>next</Text>
        </Pressable>
      </>
    );
  };
});

describe("IndoorNavigationPage", () => {
  let useStateSpy: jest.SpyInstance;
  let useEffectSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    mockState.currentFloor = 1;

    useEffectSpy = jest.spyOn(React, "useEffect").mockImplementation(() => {});

    useStateSpy = jest.spyOn(React, "useState");
  });

  afterEach(() => {
    useStateSpy.mockRestore();
    useEffectSpy.mockRestore();
  });

  it("shows loader while loadingSteps is true", () => {
    useStateSpy
      .mockImplementationOnce(() => [[], mockSetSteps] as any)
      .mockImplementationOnce(() => [true, mockSetLoadingSteps] as any)
      .mockImplementationOnce(() => [0, mockSetCurrentStepIndex] as any);

    const screen = render(<IndoorNavigationPage />);

    expect(
      screen.UNSAFE_getByType(require("react-native").ActivityIndicator),
    ).toBeTruthy();
  });

  it("renders navigation UI when loadingSteps is false", () => {
    useStateSpy
      .mockImplementationOnce(() => [mockSteps, mockSetSteps] as any)
      .mockImplementationOnce(() => [false, mockSetLoadingSteps] as any)
      .mockImplementationOnce(() => [0, mockSetCurrentStepIndex] as any);

    const screen = render(<IndoorNavigationPage />);

    expect(screen.getByTestId("instruction-card").props.children).toBe(
      "Head straight",
    );
    expect(screen.getByTestId("nav-map-container").props.children).toContain(
      '"buildingCode":"VL"',
    );
    expect(screen.getByTestId("nav-map-container").props.children).toContain(
      '"preferredFloorNumber":2',
    );
    expect(screen.getByTestId("nav-map-container").props.children).toContain(
      '"navigationStepIndex":0',
    );
    expect(screen.getByTestId("nav-bottom-sheet")).toBeTruthy();
  });

  it("handles back press by cleaning up and returning to browse", () => {
    useStateSpy
      .mockImplementationOnce(() => [mockSteps, mockSetSteps] as any)
      .mockImplementationOnce(() => [false, mockSetLoadingSteps] as any)
      .mockImplementationOnce(() => [0, mockSetCurrentStepIndex] as any);

    const screen = render(<IndoorNavigationPage />);

    fireEvent.press(screen.getByTestId("indoor-nav-back-btn"));

    expect(mockState.clearRoute).toHaveBeenCalled();
    expect(mockState.exitItinerary).toHaveBeenCalled();
    expect(mockState.setCurrentFloor).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(drawer)/indoor-map",
      params: { buildingCode: "VL" },
    });
  });

  it("advances to the next step when next is pressed before the last step", () => {
    useStateSpy
      .mockImplementationOnce(() => [mockSteps, mockSetSteps] as any)
      .mockImplementationOnce(() => [false, mockSetLoadingSteps] as any)
      .mockImplementationOnce(() => [0, mockSetCurrentStepIndex] as any);

    const screen = render(<IndoorNavigationPage />);

    fireEvent.press(screen.getByTestId("next-btn"));

    expect(mockSetCurrentStepIndex).toHaveBeenCalled();
  });

  it("cleans up when next is pressed on the last step", () => {
    useStateSpy
      .mockImplementationOnce(() => [mockSteps, mockSetSteps] as any)
      .mockImplementationOnce(() => [false, mockSetLoadingSteps] as any)
      .mockImplementationOnce(() => [1, mockSetCurrentStepIndex] as any);

    const screen = render(<IndoorNavigationPage />);

    fireEvent.press(screen.getByTestId("next-btn"));

    expect(mockState.clearRoute).toHaveBeenCalled();
    expect(mockState.exitItinerary).toHaveBeenCalled();
    expect(mockState.setCurrentFloor).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(drawer)/indoor-map",
      params: { buildingCode: "VL" },
    });
  });
});