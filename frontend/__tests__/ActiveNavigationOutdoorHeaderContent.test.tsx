import { fireEvent, render } from "@testing-library/react-native";
import ActiveNavigationOutdoorHeaderContent from "../components/activeNavigation/ActiveNavigationOutdoorHeaderContent";

const mockPush = jest.fn();
const mockCloseSheet = jest.fn();
const mockGetDirectionsSequence = jest.fn();
const mockUseNavigationStore = jest.fn();
const mockMoveCamera = jest.fn();
const mockUseMapSettings = jest.fn();

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

jest.mock("@/contexts/MapCameraContext", () => ({
  useMapCamera: () => ({ moveCamera: mockMoveCamera }),
}));

jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  default: () => mockUseMapSettings(),
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
                  duration: "1 min",
                  start: { latitude: 45.497, longitude: -73.579 },
                  end: { latitude: 45.4972, longitude: -73.5788 },
                  polyline: "",
                },
                {
                  maneuver: "straight",
                  instruction: "Continue straight",
                  distance: "200 m",
                  duration: "2 mins",
                  start: { latitude: 45.4972, longitude: -73.5788 },
                  end: { latitude: 45.4975, longitude: -73.5785 },
                  polyline: "",
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
    mockUseMapSettings.mockReturnValue({
      mapSettings: {
        recenterOnStepDuringActiveNavigation: true,
      },
    });
    mockUseNavigationStore.mockReturnValue(createState());
  });

  test("returns null when currentDirections is not set", () => {
    mockUseNavigationStore.mockReturnValue(createState({ currentDirections: null }));

    const { toJSON } = render(<ActiveNavigationOutdoorHeaderContent />);

    expect(toJSON()).toBeNull();
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
    expect(mockMoveCamera).toHaveBeenCalledWith(
      expect.objectContaining({
        latitude: 45.49735,
        longitude: -73.57865000000001,
        duration: 500,
      }),
    );
    expect(mockMoveCamera.mock.calls[0][0].delta).toBeCloseTo(-0.0012, 6);
  });

  test("does nothing when previous is pressed at first step", () => {
    const state = createState({ currentOutdoorStepIndex: 0 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationOutdoorHeaderContent />);

    fireEvent.press(getByTestId("previous-step"));

    expect(state.setCurrentOutdoorStepIndex).not.toHaveBeenCalled();
  });

  test("goes to previous step when previous is pressed", () => {
    const state = createState({ currentOutdoorStepIndex: 1 });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByTestId } = render(<ActiveNavigationOutdoorHeaderContent />);

    fireEvent.press(getByTestId("previous-step"));

    expect(state.setCurrentOutdoorStepIndex).toHaveBeenCalledWith(0);
    expect(mockMoveCamera).toHaveBeenCalledWith({
      latitude: 45.497,
      longitude: -73.579,
      duration: 500,
    });
  });

  test("does not recenter camera when recenter setting is disabled", () => {
    const state = createState({ currentOutdoorStepIndex: 0 });
    mockUseNavigationStore.mockReturnValue(state);
    mockUseMapSettings.mockReturnValue({
      mapSettings: {
        recenterOnStepDuringActiveNavigation: false,
      },
    });

    const { getByTestId } = render(<ActiveNavigationOutdoorHeaderContent />);

    fireEvent.press(getByTestId("main-action"));

    expect(state.setCurrentOutdoorStepIndex).toHaveBeenCalledWith(1);
    expect(mockMoveCamera).not.toHaveBeenCalled();
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

  test("renders subway transit instruction with all fields", () => {
    const state = createState({
      transitMode: "transit",
      currentDirections: {
        directionBlocks: [
          {
            type: "outdoor",
            sequenceNumber: 0,
            directionsByMode: {
              transit: {
                steps: [
                  {
                    transit_type: "SUBWAY",
                    transit_line: "Green",
                    transit_headsign: "Berri-UQAM",
                    arrival_stop: "Lionel-Groulx",
                    distance: "5 km",
                  },
                ],
              },
            },
          },
        ],
      },
    });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<ActiveNavigationOutdoorHeaderContent />);

    expect(getByText("Metro Green towards Berri-UQAM, exit at Lionel-Groulx")).toBeTruthy();
  });

  test("renders bus transit instruction with all fields", () => {
    const state = createState({
      transitMode: "transit",
      currentDirections: {
        directionBlocks: [
          {
            type: "outdoor",
            sequenceNumber: 0,
            directionsByMode: {
              transit: {
                steps: [
                  {
                    transit_type: "BUS",
                    transit_line: "80",
                    transit_headsign: "Sud",
                    arrival_stop: "Guy-Concordia",
                    distance: "2 km",
                  },
                ],
              },
            },
          },
        ],
      },
    });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<ActiveNavigationOutdoorHeaderContent />);

    expect(getByText("Bus 80 towards Sud, exit at Guy-Concordia")).toBeTruthy();
  });

  test("renders bus transit instruction with no optional fields", () => {
    const state = createState({
      transitMode: "transit",
      currentDirections: {
        directionBlocks: [
          {
            type: "outdoor",
            sequenceNumber: 0,
            directionsByMode: {
              transit: {
                steps: [
                  {
                    transit_type: "BUS",
                    distance: "1 km",
                  },
                ],
              },
            },
          },
        ],
      },
    });
    mockUseNavigationStore.mockReturnValue(state);

    const { getByText } = render(<ActiveNavigationOutdoorHeaderContent />);

    expect(getByText("Bus")).toBeTruthy();
  });
});
