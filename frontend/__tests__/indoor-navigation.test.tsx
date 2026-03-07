import { buildIndoorNavigationSteps } from "@/app/utils/indoorNavigationSteps";
import {
  render,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react-native";
import IndoorNavigationPage from "@/app/indoor-navigation";

const mockReplace = jest.fn();
const mockBuildIndoorNavigationSteps = buildIndoorNavigationSteps as jest.Mock;

const mockFloors = [{ number: 2, imgPath: "floor2.svg", pois: [] }];
const mockFloorsResponse = { data: { floors: mockFloors } };

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
    label: "Start",
  },
  currentFloor: 1 as number | null,
  setCurrentFloor: jest.fn(),
  clearRoute: jest.fn(),
  exitItinerary: jest.fn(),
};

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
  useGetBuildingFloors: jest.fn(() => mockFloorsResponse),
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
          navigationStartOverride: props.navigationStartOverride,
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

describe("IndoorNavigationPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockState.currentFloor = 1;
    mockState.routeSegments = [
      {
        floorNumber: 2,
        distance: 10,
        path: [
          { x: 0.1, y: 0.2 },
          { x: 0.4, y: 0.2 },
        ],
      },
    ] as any;

    mockBuildIndoorNavigationSteps.mockResolvedValue(mockSteps);
  });

  afterEach(() => {
    cleanup();
  });

  it("builds steps from route segments and renders the first step", async () => {
    const screen = render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(mockBuildIndoorNavigationSteps).toHaveBeenCalledWith({
        segments: mockState.routeSegments,
        floors: mockFloors,
        transitionType: 1,
        exactTotalDistanceMeters: 25,
      });
    });

    expect(screen.getByTestId("instruction-card").props.children).toBe(
      "Head straight",
    );
  });

  it("sets current floor to current step floor when different", async () => {
    render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(mockState.setCurrentFloor).toHaveBeenCalledWith(2);
    });
  });

  it("does not build steps or show bottom sheet when no route segments exist", async () => {
    mockState.routeSegments = [] as any;

    const screen = render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("instruction-card").props.children).toBe(
        "no-step",
      );
    });

    expect(mockBuildIndoorNavigationSteps).not.toHaveBeenCalled();
    expect(screen.queryByTestId("nav-bottom-sheet")).toBeNull();
  });

  it("uses start coord as navigationStartOverride on first step", async () => {
    const screen = render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("nav-map-container").props.children).toContain(
        `"navigationStartOverride":{"x":0.1,"y":0.2}`,
      );
    });
  });

  it("uses target point as navigationStartOverride on arrival step", async () => {
    const screen = render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("next-btn")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("next-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("instruction-card").props.children).toBe(
        "You have arrived",
      );
    });

    expect(screen.getByTestId("nav-map-container").props.children).toContain(
      `"navigationStartOverride":{"x":0.4,"y":0.2}`,
    );
  });

  it("returns to browse on back press", async () => {
    const screen = render(<IndoorNavigationPage />);

    await waitFor(() => {
      expect(screen.getByTestId("instruction-card")).toBeTruthy();
    });

    fireEvent.press(screen.getByTestId("indoor-nav-back-btn"));

    expect(mockState.clearRoute).toHaveBeenCalled();
    expect(mockState.exitItinerary).toHaveBeenCalled();
    expect(mockState.setCurrentFloor).toHaveBeenCalledWith(null);
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/(drawer)/indoor-map",
      params: { buildingCode: "VL" },
    });
  });
});