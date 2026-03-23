import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import StartNavigationButton from "../components/StartNavigationButton";

const mockUseNavigationStore = jest.fn();
const mockPush = jest.fn();
const mockIsFloorPlanAvailable = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../app/utils/indoorMapUtils", () => ({
  isFloorPlanAvailable: (...args: any[]) => mockIsFloorPlanAvailable(...args),
}));

jest.mock("../hooks/useNavigationStore", () => ({
  NavigationPhase: {
    PREPARATION: "PREPARATION",
    ACTIVE: "ACTIVE",
  },
  useNavigationStore: () => mockUseNavigationStore(),
}));

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockMaterialCommunityIcons() {
    return React.createElement(Text, { testID: "start-nav-icon" }, "Icon");
  };
});

describe("StartNavigationButton", () => {
  const createState = (overrides?: Partial<any>) => ({
    startLocation: {
      latitude: 45.497,
      longitude: -73.579,
      name: "Start",
      code: "MB",
    },
    endLocation: {
      latitude: 45.499,
      longitude: -73.58,
      name: "End",
      code: "H",
    },
    transitMode: "walking",
    currentDirections: { directionBlocks: [] },
    navigationPhase: "PREPARATION",
    setNavigationPhase: jest.fn(),
    setCurrentOutdoorStepIndex: jest.fn(),
    setStartDateTime: jest.fn(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsFloorPlanAvailable.mockReturnValue(false);
    mockUseNavigationStore.mockReturnValue(createState());
  });

  test("returns null when start location is missing", () => {
    mockUseNavigationStore.mockReturnValue(createState({ startLocation: undefined }));

    const { queryByText } = render(<StartNavigationButton />);

    expect(queryByText("Start")).toBeNull();
  });

  test("disables button when navigation is not ready", () => {
    const state = createState({ currentDirections: undefined });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<StartNavigationButton />);

    fireEvent.press(getByText("Start"));

    expect(state.setNavigationPhase).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("starts outdoor navigation when ready and start is outdoor", () => {
    const state = createState();
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<StartNavigationButton />);

    fireEvent.press(getByText("Start"));

    expect(state.setNavigationPhase).toHaveBeenCalledWith("ACTIVE");
    expect(state.setCurrentOutdoorStepIndex).toHaveBeenCalledWith(0);
    expect(state.setStartDateTime).toHaveBeenCalledWith(expect.any(Date));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/map" });
  });

  test("navigates to indoor map when start location is indoor and floor map exists", () => {
    const state = createState({
      startLocation: {
        latitude: 45.497,
        longitude: -73.579,
        name: "MB S2",
        code: "MB",
        building: "MB",
        floor_number: -2,
        indoor_position: { x: 0.2, y: 0.3 },
      },
    });

    mockIsFloorPlanAvailable.mockReturnValue(true);
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<StartNavigationButton />);

    fireEvent.press(getByText("Start"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "MB",
        selectedFloor: "-2",
        selectedPoiName: "MB S2",
      },
    });
  });

  test("does not start navigation when disabled prop is true", () => {
    const state = createState();
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<StartNavigationButton disabled />);

    fireEvent.press(getByText("Start"));

    expect(state.setNavigationPhase).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
