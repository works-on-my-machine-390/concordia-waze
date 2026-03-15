import React from "react";
import { render } from "@testing-library/react-native";

const mockUseSegments = jest.fn();
const mockInitTelemetry = jest.fn();
const mockTrackScreen = jest.fn();

jest.mock("expo-router", () => {
  const Stack = ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  );

  (Stack as any).Screen = () => null;

  return {
    Stack,
    useSegments: () => mockUseSegments(),
  };
});

jest.mock("react-native-gesture-handler", () => {
  const { View } = require("react-native");

  return {
    GestureHandlerRootView: ({ children }: { children?: React.ReactNode }) => (
      <View>{children}</View>
    ),
  };
});

jest.mock("toastify-react-native", () => () => null);

jest.mock("@/lib/telemetry", () => ({
  initTelemetry: (...args: any[]) => mockInitTelemetry(...args),
  trackScreen: (...args: any[]) => mockTrackScreen(...args),
}));

import RootLayout from "../app/_layout";

describe("RootLayout", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockInitTelemetry.mockResolvedValue(undefined);
    mockTrackScreen.mockResolvedValue(undefined);
  });

  test("initializes telemetry on mount", () => {
    mockUseSegments.mockReturnValue([]);

    render(<RootLayout />);

    expect(mockInitTelemetry).toHaveBeenCalledTimes(1);
  });

  test("tracks index screen when route segments are empty", () => {
    mockUseSegments.mockReturnValue([]);

    render(<RootLayout />);

    expect(mockTrackScreen).toHaveBeenCalledWith("index");
  });

  test("tracks route name by excluding group segments", () => {
    mockUseSegments
      .mockReturnValueOnce(["(drawer)", "map"])
      .mockReturnValueOnce(["(drawer)", "indoor-navigation"]);

    const screen = render(<RootLayout />);

    expect(mockTrackScreen).toHaveBeenCalledWith("map");

    screen.rerender(<RootLayout />);

    expect(mockTrackScreen).toHaveBeenCalledWith("indoor-navigation");
  });
});
