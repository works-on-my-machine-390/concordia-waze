import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import ActiveNavigationIndoorHeaderContent from "../components/activeNavigation/ActiveNavigationIndoorHeaderContent";

const mockBuildIndoorNavigationSteps = jest.fn();
const mockGetDirectionsSequence = jest.fn();
const mockUseNavigationStore = jest.fn();
const mockSetParams = jest.fn();
const mockPush = jest.fn();
const mockCloseSheet = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(),
  useRouter: jest.fn(),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: ({ name }: any) => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, { testID: "indoor-step-icon" }, name);
  },
}));

jest.mock("@/app/utils/stringUtils", () => ({
  getArrivalInstruction: () => "Mock arrival instruction",
}));

jest.mock("@/app/utils/indoorNavigationSteps", () => ({
  buildIndoorNavigationSteps: (...args: any[]) =>
    mockBuildIndoorNavigationSteps(...args),
}));

jest.mock("@/hooks/queries/indoorMapQueries", () => ({
  useGetBuildingFloors: jest.fn(() => ({
    isLoading: false,
    data: {
      floors: [],
    },
  })),
}));

jest.mock("@/hooks/useMapStore", () => ({
  useMapStore: (selector: any) => selector({ closeSheet: mockCloseSheet }),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  useNavigationStore: () => mockUseNavigationStore(),
  getDirectionsSequence: (...args: any[]) => mockGetDirectionsSequence(...args),
}));

jest.mock("../components/activeNavigation/ActiveNavigationHeaderStepper", () => {
  const React = require("react");
  const { View, Text, TouchableOpacity } = require("react-native");
  return function MockStepper(props: any) {
    return React.createElement(
      View,
      null,
      React.createElement(Text, { testID: "stepper-label" }, props.mainActionText()),
      React.createElement(
        TouchableOpacity,
        { testID: "previous-step", onPress: props.onPreviousStep },
        React.createElement(Text, null, "Previous"),
      ),
      React.createElement(
        TouchableOpacity,
        { testID: "main-action", onPress: props.mainActionPress },
        React.createElement(Text, null, "Main action"),
      ),
    );
  };
});

describe("ActiveNavigationIndoorHeaderContent", () => {
  const mockedUseRouter = useRouter as jest.Mock;
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

  const indoorSteps = [
    {
      id: "turn-0-1",
      floorNumber: 1,
      targetPoint: { x: 0.1, y: 0.2 },
      kind: "transition",
      iconName: "swap-vertical",
      instruction: "Take stairs",
      distanceMeters: 25,
      remainingDistanceMeters: 40,
    },
    {
      id: "arrival-1",
      floorNumber: 2,
      targetPoint: { x: 0.5, y: 0.6 },
      kind: "arrival",
      iconName: "location",
      instruction: "Arrive",
      distanceMeters: 10,
      remainingDistanceMeters: 10,
    },
  ];

  const createState = (overrides?: Partial<any>) => ({
    currentIndoorStepIndex: 0,
    setCurrentIndoorStepIndex: jest.fn(),
    setIndoorNavigationSteps: jest.fn(),
    clearState: jest.fn(),
    startLocation: { code: "MB" },
    endLocation: { code: "H" },
    currentDirections: {
      directionBlocks: [
        {
          type: "indoor",
          sequenceNumber: 0,
          directions: {
            segments: [],
            transitionType: 1,
            totalDistance: 35,
          },
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseRouter.mockReturnValue({
      setParams: mockSetParams,
      push: mockPush,
    });
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "MB" });
    mockGetDirectionsSequence.mockReturnValue({ 0: "indoor" });
    mockBuildIndoorNavigationSteps.mockResolvedValue(indoorSteps);
    mockUseNavigationStore.mockReturnValue(createState());
  });

  test("builds indoor steps and renders current step details", async () => {
    const state = createState();
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<ActiveNavigationIndoorHeaderContent />);

    await waitFor(() => {
      expect(getByText("25 m")).toBeTruthy();
    });

    expect(getByText("Mock arrival instruction")).toBeTruthy();
    expect(state.setIndoorNavigationSteps).toHaveBeenCalledWith(indoorSteps);
    expect(mockBuildIndoorNavigationSteps).toHaveBeenCalled();
  });

  test("moves to previous step and syncs floor when floor changes", async () => {
    const state = createState({ currentIndoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationIndoorHeaderContent />);

    await waitFor(() => {
      expect(mockBuildIndoorNavigationSteps).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("previous-step"));

    expect(mockSetParams).toHaveBeenCalledWith({ selectedFloor: "1" });
    expect(state.setCurrentIndoorStepIndex).toHaveBeenCalledWith(0);
  });

  test("advances to next step and updates floor for transition steps", async () => {
    const state = createState({ currentIndoorStepIndex: 0 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationIndoorHeaderContent />);

    await waitFor(() => {
      expect(mockBuildIndoorNavigationSteps).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("main-action"));

    expect(mockSetParams).toHaveBeenCalledWith({ selectedFloor: "2" });
    expect(state.setCurrentIndoorStepIndex).toHaveBeenCalledWith(1);
  });

  test("continues outdoors when the last indoor step is followed by outdoor navigation", async () => {
    const state = createState({
      currentIndoorStepIndex: 1,
      currentDirections: {
        directionBlocks: [
          {
            type: "indoor",
            sequenceNumber: 0,
            directions: {
              segments: [],
              transitionType: 1,
              totalDistance: 35,
            },
          },
          {
            type: "outdoor",
            sequenceNumber: 1,
            directionsByMode: {},
          },
        ],
      },
    });

    mockUseNavigationStore.mockReturnValue(state);
    mockGetDirectionsSequence.mockReturnValue({ 0: "indoor", 1: "outdoor" });

    const { getByText, getByTestId } = render(
      <ActiveNavigationIndoorHeaderContent />,
    );

    await waitFor(() => {
      expect(getByText("Continue outdoors")).toBeTruthy();
    });

    fireEvent.press(getByTestId("main-action"));

    expect(state.setCurrentIndoorStepIndex).toHaveBeenCalledWith(0);
    expect(mockPush).toHaveBeenCalledWith("/map");
  });

  test("finishes navigation on final indoor step", async () => {
    const state = createState({ currentIndoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);
    mockGetDirectionsSequence.mockReturnValue({ 0: "indoor" });

    const { getByText, getByTestId } = render(
      <ActiveNavigationIndoorHeaderContent />,
    );

    await waitFor(() => {
      expect(getByText("Finish")).toBeTruthy();
    });

    fireEvent.press(getByTestId("main-action"));

    expect(state.clearState).toHaveBeenCalledTimes(1);
    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });
});
