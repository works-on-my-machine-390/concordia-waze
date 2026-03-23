import { fireEvent, render } from "@testing-library/react-native";
import ActiveNavigationOutdoorHeaderContent from "../components/activeNavigation/ActiveNavigationOutdoorHeaderContent";

const mockPush = jest.fn();
const mockCloseSheet = jest.fn();
const mockGetDirectionsSequence = jest.fn();
const mockUseNavigationStore = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@/app/icons", () => ({
  LoginIcon: () => {
    const React = require("react");
    const { Text } = require("react-native");
    return React.createElement(Text, { testID: "login-icon" }, "LoginIcon");
  },
}));

jest.mock("@/app/utils/stringUtils", () => ({
  stripHtmlTags: (value: string) => value.replaceAll(/<[^>]+>/g, ""),
}));

jest.mock("@/hooks/useMapStore", () => ({
  useMapStore: (selector: any) => selector({ closeSheet: mockCloseSheet }),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  useNavigationStore: () => mockUseNavigationStore(),
  getDirectionsSequence: (...args: any[]) => mockGetDirectionsSequence(...args),
}));

jest.mock("../components/DirectionIcon", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockDirectionIcon() {
    return React.createElement(Text, { testID: "direction-icon" }, "DirectionIcon");
  };
});

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

describe("ActiveNavigationOutdoorHeaderContent", () => {
  const createState = (overrides?: Partial<any>) => ({
    transitMode: "walking",
    currentOutdoorStepIndex: 0,
    setCurrentOutdoorStepIndex: jest.fn(),
    clearState: jest.fn(),
    endLocation: {
      code: "H",
      name: "Hall Building",
    },
    currentDirections: {
      directionBlocks: [
        {
          type: "outdoor",
          sequenceNumber: 0,
          directionsByMode: {
            walking: {
              steps: [
                {
                  maneuver: "turn-left",
                  instruction: "<b>Turn left</b>",
                  distance: "100 m",
                },
                {
                  maneuver: "straight",
                  instruction: "Continue straight",
                  distance: "200 m",
                },
              ],
            },
          },
        },
      ],
    },
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDirectionsSequence.mockReturnValue({ 0: "outdoor" });
    mockUseNavigationStore.mockReturnValue(createState());
  });

  test("renders indoor-only content and continues to indoor map", () => {
    const state = createState({
      currentDirections: {
        directionBlocks: [],
      },
    });

    mockUseNavigationStore.mockReturnValue(state);
    mockGetDirectionsSequence.mockReturnValue({ 0: "indoor" });

    const { getByText, getByTestId } = render(
      <ActiveNavigationOutdoorHeaderContent />,
    );

    expect(getByText(/Proceed to the indoor map/i)).toBeTruthy();
    expect(getByText("Continue indoors")).toBeTruthy();

    fireEvent.press(getByTestId("main-action"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "H",
        selectedPoiName: "Hall Building",
      },
    });
  });

  test("advances to next outdoor step when not on last step", () => {
    const state = createState({ currentOutdoorStepIndex: 0 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText, getByTestId } = render(
      <ActiveNavigationOutdoorHeaderContent />,
    );

    expect(getByText("Next step")).toBeTruthy();

    fireEvent.press(getByTestId("main-action"));

    expect(state.setCurrentOutdoorStepIndex).toHaveBeenCalledWith(1);
  });

  test("goes to previous step when previous is pressed", () => {
    const state = createState({ currentOutdoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationOutdoorHeaderContent />);

    fireEvent.press(getByTestId("previous-step"));

    expect(state.setCurrentOutdoorStepIndex).toHaveBeenCalledWith(0);
  });

  test("continues indoors on final outdoor step when indoor block follows", () => {
    const state = createState({ currentOutdoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);
    mockGetDirectionsSequence.mockReturnValue({ 0: "outdoor", 1: "indoor" });

    const { getByText, getByTestId } = render(
      <ActiveNavigationOutdoorHeaderContent />,
    );

    expect(getByText("Continue indoors")).toBeTruthy();

    fireEvent.press(getByTestId("main-action"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "H",
        selectedPoiName: "Hall Building",
      },
    });
  });

  test("finishes navigation on final step when route ends outdoors", () => {
    const state = createState({ currentOutdoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);
    mockGetDirectionsSequence.mockReturnValue({ 0: "outdoor" });

    const { getByText, getByTestId } = render(
      <ActiveNavigationOutdoorHeaderContent />,
    );

    expect(getByText("Finish")).toBeTruthy();

    fireEvent.press(getByTestId("main-action"));

    expect(state.clearState).toHaveBeenCalledTimes(1);
    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });
});
