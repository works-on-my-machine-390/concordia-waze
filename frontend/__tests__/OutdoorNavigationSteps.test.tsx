import { COLORS } from "@/app/constants";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import { isFloorPlanAvailable } from "@/app/utils/indoorMapUtils";
import {
  DirectionsResponseBlockType,
  OutdoorDirectionsModel,
  StepModel,
  TransitMode,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";
import React from "react";
import OutdoorNavigationSteps from "../components/OutdoorNavigationSteps";

const mockDirectionIcon = jest.fn();
const mockOutdoorNavigationTransitSteps = jest.fn();
const mockReplace = jest.fn();

jest.mock("../components/DirectionIcon", () => {
  return function MockDirectionIcon(props: any) {
    const { Text } = require("react-native");
    mockDirectionIcon(props);
    return <Text testID="direction-icon" />;
  };
});

jest.mock("../components/OutdoorNavigationTransitSteps", () => {
  return function MockOutdoorNavigationTransitSteps(props: any) {
    const { Text } = require("react-native");
    mockOutdoorNavigationTransitSteps(props);
    return <Text testID="outdoor-navigation-transit-steps" />;
  };
});

jest.mock("@/app/utils/stringUtils", () => ({
  stripHtmlTags: jest.fn((value: string) => value.replaceAll(/<[^>]*>/g, "")),
}));

jest.mock("@/app/utils/indoorMapUtils", () => ({
  isFloorPlanAvailable: jest.fn(),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  useNavigationStore: jest.fn(),
}));

jest.mock("expo-router", () => ({
  router: {
    replace: (...args: any[]) => mockReplace(...args),
  },
  useLocalSearchParams: jest.fn(),
}));

describe("OutdoorNavigationSteps", () => {
  const mockedUseNavigationStore = useNavigationStore as unknown as jest.Mock;
  const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;
  const mockedIsFloorPlanAvailable = isFloorPlanAvailable as jest.Mock;

  const createStep = (overrides?: Partial<StepModel>): StepModel => ({
    instruction: "Walk straight",
    distance: "0.2 km",
    duration: "2 min",
    start: { latitude: 45.49, longitude: -73.57 },
    end: { latitude: 45.5, longitude: -73.58 },
    polyline: "encoded-polyline",
    ...overrides,
  });

  const createDirections = (
    overrides?: Partial<OutdoorDirectionsModel>,
  ): OutdoorDirectionsModel => ({
    mode: TransitMode.walking,
    duration: "12 min",
    distance: "1.4 km",
    departure_message: "Depart now",
    polyline: "encoded-route-polyline",
    steps: [createStep()],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockedUseNavigationStore.mockImplementation((selector?: any) => {
      const state = {
        startLocation: {
          code: "MB",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
        endLocation: {
          code: "H",
          name: "Hall Building",
          latitude: 45.497,
          longitude: -73.579,
        },
        currentDirections: undefined,
        transitMode: TransitMode.walking,
      };

      return typeof selector === "function" ? selector(state) : state;
    });
    mockedUseLocalSearchParams.mockReturnValue({});
    mockedIsFloorPlanAvailable.mockReturnValue(true);
  });

  it("renders non-transit steps and strips HTML from instructions", () => {
    const directions = createDirections({
      steps: [
        createStep({
          instruction: "<b>Head</b> north",
          maneuver: "turn-left",
          travel_mode: "WALKING",
          polyline: "polyline-1",
        }),
        createStep({
          instruction: "Take the shuttle",
          distance: "2.1 km",
          travel_mode: "Shuttle",
          polyline: "polyline-2",
        }),
      ],
    });

    const { getByText } = render(<OutdoorNavigationSteps outdoorDirections={directions} />);

    expect(getByText("Steps")).toBeTruthy();
    expect(getByText("Head north")).toBeTruthy();
    expect(getByText("Take the shuttle")).toBeTruthy();
    expect(getByText("0.2 km")).toBeTruthy();
    expect(getByText("2.1 km")).toBeTruthy();

    expect(stripHtmlTags).toHaveBeenCalledTimes(2);
    expect(stripHtmlTags).toHaveBeenCalledWith("<b>Head</b> north");
    expect(stripHtmlTags).toHaveBeenCalledWith("Take the shuttle");

    expect(mockDirectionIcon).toHaveBeenCalledTimes(1);
    expect(mockDirectionIcon).toHaveBeenCalledWith(
      expect.objectContaining({
        maneuver: "turn-left",
        size: 32,
        color: COLORS.textPrimary,
      }),
    );
    expect(mockOutdoorNavigationTransitSteps).not.toHaveBeenCalled();
  });

  it("renders transit-specific component when mode is transit", () => {
    const directions = createDirections({
      mode: TransitMode.transit,
      steps: [createStep({ instruction: "This should not render", polyline: "polyline-3" })],
    });

    const { getByTestId, queryByText } = render(
      <OutdoorNavigationSteps outdoorDirections={directions} />,
    );

    expect(getByTestId("outdoor-navigation-transit-steps")).toBeTruthy();
    expect(mockOutdoorNavigationTransitSteps).toHaveBeenCalledWith(
      expect.objectContaining({ directions }),
    );
    expect(queryByText("This should not render")).toBeNull();
    expect(mockDirectionIcon).not.toHaveBeenCalled();
  });

  it("renders placeholder when directions are missing", () => {
    const { getByText } = render(
      <OutdoorNavigationSteps outdoorDirections={undefined as unknown as OutdoorDirectionsModel} />,
    );

    expect(getByText("No directions available")).toBeTruthy();
  });

  it("renders indoor transition steps and supports view map navigation", () => {
    mockedUseLocalSearchParams.mockReturnValue({ buildingCode: "MB" });
    mockedIsFloorPlanAvailable.mockReturnValue(true);

    const directions = createDirections({
      steps: [createStep({ instruction: "Walk outside", polyline: "polyline-4" })],
    });

    const { getByText } = render(
      <OutdoorNavigationSteps
        outdoorDirections={directions}
        outdoorDirectionSequenceNumber={1}
        indoorDirectionBlocks={[
          { type: "indoor", directions: {} as any, sequenceNumber: 0 },
          { type: "indoor", directions: {} as any, sequenceNumber: 2 },
        ]}
      />,
    );

    expect(getByText("Exit the building")).toBeTruthy();
    expect(getByText("Enter the building and navigate to Hall Building")).toBeTruthy();

    fireEvent.press(getByText("View map"));

    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "H",
        buildingName: "Hall Building",
        selectedFloor: undefined,
      },
    });
  });

  it("uses store directions when outdoorDirections prop is not provided", () => {
    const walkingDirections = createDirections({
      steps: [createStep({ instruction: "From store directions", polyline: "polyline-store" })],
    });

    mockedUseNavigationStore.mockImplementation((selector?: any) => {
      const state = {
        startLocation: {
          code: "MB",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
        endLocation: {
          code: "H",
          name: "Hall Building",
          latitude: 45.497,
          longitude: -73.579,
        },
        currentDirections: {
          directionBlocks: [
            {
              type: DirectionsResponseBlockType.OUTDOOR,
              directionsByMode: {
                [TransitMode.walking]: walkingDirections,
              },
            },
          ],
        },
        transitMode: TransitMode.walking,
      };

      return typeof selector === "function" ? selector(state) : state;
    });

    const { getByText } = render(
      <OutdoorNavigationSteps
        outdoorDirections={undefined as unknown as OutdoorDirectionsModel}
      />,
    );

    expect(getByText("From store directions")).toBeTruthy();
  });
});
