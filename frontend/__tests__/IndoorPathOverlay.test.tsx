import React from "react";
import { render } from "@testing-library/react-native";
import IndoorPathOverlay from "@/components/indoor/IndoorPathOverlay";
import { useNavigationStore } from "@/hooks/useNavigationStore";

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="svg-root">{children}</View>,
    Circle: (props: any) => <View testID="svg-circle" {...props} />,
  };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: jest.fn(() => ({
    buildingCode: "H",
    selectedFloor: "1",
  })),
}));

jest.mock("@/app/utils/pathUtils", () => ({
  createDottedPathPoints: jest.fn((path) => path),
  getClosestPointIndex: jest.fn(() => 0),
  getSafeStepIndex: jest.fn((index) => index ?? 0),
  getSegmentIndexFromStepId: jest.fn(() => undefined),
  orthogonalizePath: jest.fn((path) => path),
  simplifyOrthogonalPath: jest.fn((path) => path),
}));

describe("IndoorPathOverlay", () => {
  beforeEach(() => {
    useNavigationStore.setState({
      currentDirections: undefined,
      startLocation: undefined,
      endLocation: undefined,
      indoorNavigationSteps: [],
      currentIndoorStepIndex: 0,
    });
  });

  it("returns null when no matching floor segment is available", () => {
    const { queryByTestId } = render(
      <IndoorPathOverlay width={100} height={100} />,
    );

    expect(queryByTestId("svg-root")).toBeNull();
  });

  it("renders dots and markers for a valid indoor segment", () => {
    useNavigationStore.setState({
      startLocation: {
        name: "Hall",
        code: "H",
        latitude: 45.49,
        longitude: -73.57,
        building: "H",
        floor_number: 1,
        indoor_position: { x: 0.1, y: 0.1 },
      } as any,
      currentDirections: {
        durationBlock: { type: "duration", durations: {} },
        directionBlocks: [
          {
            type: "indoor",
            directions: {
              segments: [
                {
                  floorNumber: 1,
                  distance: 10,
                  path: [
                    { x: 0.1, y: 0.1 },
                    { x: 0.8, y: 0.1 },
                  ],
                },
              ],
            },
          },
        ],
      } as any,
    });

    const { getByTestId, getAllByTestId } = render(
      <IndoorPathOverlay width={200} height={200} />,
    );

    expect(getByTestId("svg-root")).toBeTruthy();
    expect(getAllByTestId("indoor-path-dot").length).toBeGreaterThan(0);
    expect(getByTestId("indoor-path-start")).toBeTruthy();
    expect(getByTestId("indoor-path-end")).toBeTruthy();
  });

  it("returns null when current segment path is too short", () => {
    useNavigationStore.setState({
      startLocation: {
        name: "Hall",
        code: "H",
        latitude: 45.49,
        longitude: -73.57,
        building: "H",
        floor_number: 1,
        indoor_position: { x: 0.1, y: 0.1 },
      } as any,
      currentDirections: {
        durationBlock: { type: "duration", durations: {} },
        directionBlocks: [
          {
            type: "indoor",
            directions: {
              segments: [
                {
                  floorNumber: 1,
                  distance: 10,
                  path: [{ x: 0.1, y: 0.1 }],
                },
              ],
            },
          },
        ],
      } as any,
    });

    const { queryByTestId } = render(<IndoorPathOverlay width={200} height={200} />);

    expect(queryByTestId("svg-root")).toBeNull();
  });
});