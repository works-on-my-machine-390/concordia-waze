import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams, usePathname } from "expo-router";
import ActiveNavigationBottomSheet from "../components/activeNavigation/ActiveNavigationBottomSheet";

const mockOutdoorNavigationSteps = jest.fn();
const mockUseNavigationStore = jest.fn();

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 8, left: 0 }),
}));

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children, handleComponent: HandleComp }: any) => (
      <View testID="active-nav-sheet">
        {HandleComp && <HandleComp />}
        {children}
      </View>
    ),
    BottomSheetScrollView: ({ children }: any) => (
      <View testID="active-nav-sheet-scroll">{children}</View>
    ),
  };
});

jest.mock("@/app/icons", () => ({
  CloseIcon: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, null, "CloseIcon");
  },
}));

jest.mock("@/hooks/queries/navigationQueries", () => ({
  DirectionsResponseBlockType: {
    OUTDOOR: "outdoor",
    INDOOR: "indoor",
    DURATION: "duration",
  },
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  NavigationPhase: {
    PREPARATION: "PREPARATION",
    ACTIVE: "ACTIVE",
  },
  useNavigationStore: () => mockUseNavigationStore(),
}));

jest.mock("../components/OutdoorNavigationSteps", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockOutdoorNavigationSteps(props: any) {
    mockOutdoorNavigationSteps(props);
    return React.createElement(
      Text,
      { testID: "outdoor-steps" },
      "OutdoorNavigationSteps",
    );
  };
});

jest.mock("../components/activeNavigation/ReturnOutdoorButton", () => {
  const React = require("react");
  const { View, Text } = require("react-native");
  return function MockReturnOutdoorButton(props: any) {
    return React.createElement(
      View,
      null,
      React.createElement(
        Text,
        { testID: "return-outdoor-button" },
        "ReturnOutdoorButton",
      ),
      React.createElement(
        Text,
        { testID: "return-outdoor-location" },
        JSON.stringify(props.location),
      ),
    );
  };
});

describe("ActiveNavigationBottomSheet", () => {
  const mockedUsePathname = usePathname as jest.Mock;
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

  const createNavigationState = () => ({
    transitMode: "walking",
    setNavigationPhase: jest.fn(),
    setCurrentOutdoorStepIndex: jest.fn(),
    setCurrentIndoorStepIndex: jest.fn(),
    startDateTime: new Date("2026-03-22T12:00:00.000Z"),
    startLocation: {
      code: "MB",
      latitude: 45.497,
      longitude: -73.579,
    },
    endLocation: {
      code: "H",
      latitude: 45.495,
      longitude: -73.577,
    },
    currentDirections: {
      durationBlock: {
        durations: {
          walking: 600,
        },
      },
      directionBlocks: [
        {
          type: "indoor",
          sequenceNumber: 0,
          directions: {},
        },
        {
          type: "outdoor",
          sequenceNumber: 1,
          directionsByMode: {
            walking: {
              mode: "walking",
              steps: [{ instruction: "Walk", distance: "100 m" }],
            },
          },
        },
      ],
    },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsePathname.mockReturnValue("/map");
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "MB" });
    mockUseNavigationStore.mockReturnValue(createNavigationState());
  });

  test("renders ETA block and outdoor steps", () => {
    const { getByText, getByTestId } = render(<ActiveNavigationBottomSheet />);

    expect(getByTestId("active-nav-sheet")).toBeTruthy();
    expect(getByText("OutdoorNavigationSteps")).toBeTruthy();
    expect(getByText(/Arriving at/i)).toBeTruthy();
    expect(getByText(/10 min/)).toBeTruthy();
    expect(mockOutdoorNavigationSteps).toHaveBeenCalledTimes(1);
    expect(
      mockOutdoorNavigationSteps.mock.calls[0][0]
        .outdoorDirectionSequenceNumber,
    ).toBe(1);
  });

  test("closes active navigation when close button is pressed", () => {
    const state = createNavigationState();
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationBottomSheet />);

    fireEvent.press(getByTestId("close-navigation"));

    expect(state.setNavigationPhase).toHaveBeenCalledWith("PREPARATION");
  });

  test("shows return outdoor button on indoor map route with current building location", () => {
    mockedUsePathname.mockReturnValue("/indoor-map");
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "MB" });

    const { getByTestId } = render(<ActiveNavigationBottomSheet />);

    expect(getByTestId("return-outdoor-button")).toBeTruthy();
    expect(getByTestId("return-outdoor-location").props.children).toContain(
      "45.497",
    );
  });

  test("does not show return outdoor button on map route", () => {
    mockedUsePathname.mockReturnValue("/map");

    const { queryByTestId } = render(<ActiveNavigationBottomSheet />);

    expect(queryByTestId("return-outdoor-button")).toBeNull();
  });

  test("passes end location coordinates when buildingCode matches endLocation", () => {
    mockedUsePathname.mockReturnValue("/indoor-map");
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "H" });

    const { getByTestId } = render(<ActiveNavigationBottomSheet />);

    expect(getByTestId("return-outdoor-button")).toBeTruthy();
    expect(getByTestId("return-outdoor-location").props.children).toContain(
      "45.495",
    );
  });

  test("passes null location when buildingCode matches neither start nor end location", () => {
    mockedUsePathname.mockReturnValue("/indoor-map");
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "EV" });

    const { getByTestId } = render(<ActiveNavigationBottomSheet />);

    expect(getByTestId("return-outdoor-location").props.children).toBe("null");
  });

  test("renders fallback ETA block when startDateTime is not set", () => {
    const state = createNavigationState();
    mockUseNavigationStore.mockReturnValue({ ...state, startDateTime: null });

    const { getByText } = render(<ActiveNavigationBottomSheet />);

    expect(getByText(/Route will take/i)).toBeTruthy();
  });
});
