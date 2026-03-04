import { COLORS } from "@/app/constants";
import { stripHtmlTags } from "@/app/utils/stringUtils";
import {
  DirectionsModel,
  StepModel,
  TransitMode,
} from "@/hooks/queries/navigationQueries";
import { render } from "@testing-library/react-native";
import React from "react";
import OutdoorNavigationSteps from "../components/OutdoorNavigationSteps";

const mockDirectionIcon = jest.fn();
const mockOutdoorNavigationTransitSteps = jest.fn();

jest.mock("../components/DirectionIcon", () => {
  return function MockDirectionIcon(props: {
    maneuver?: string;
    size: number;
    color: string;
  }) {
    const { Text } = require("react-native");
    mockDirectionIcon(props);
    return <Text testID="direction-icon" />;
  };
});

jest.mock("../components/OutdoorNavigationTransitSteps", () => {
  return function MockOutdoorNavigationTransitSteps(props: {
    directions: DirectionsModel;
  }) {
    const { Text } = require("react-native");
    mockOutdoorNavigationTransitSteps(props);
    return <Text testID="outdoor-navigation-transit-steps" />;
  };
});

jest.mock("@/app/utils/stringUtils", () => ({
  stripHtmlTags: jest.fn((value: string) => value.replace(/<[^>]*>/g, "")),
}));

describe("OutdoorNavigationSteps", () => {
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
    overrides?: Partial<DirectionsModel>,
  ): DirectionsModel => ({
    mode: TransitMode.WALKING,
    duration: "12 min",
    distance: "1.4 km",
    departure_message: "Depart now",
    polyline: "encoded-route-polyline",
    steps: [createStep()],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
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

    const { getByText } = render(<OutdoorNavigationSteps directions={directions} />);

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
      mode: TransitMode.TRANSIT,
      steps: [createStep({ instruction: "This should not render", polyline: "polyline-3" })],
    });

    const { getByTestId, queryByText } = render(
      <OutdoorNavigationSteps directions={directions} />,
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
      <OutdoorNavigationSteps directions={undefined as unknown as DirectionsModel} />,
    );

    expect(getByText("No directions available")).toBeTruthy();
  });
});
