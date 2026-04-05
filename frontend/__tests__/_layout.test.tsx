import React from "react";
import { render } from "@testing-library/react-native";

const mockUseSegments = jest.fn();
const mockInitTelemetry = jest.fn();
const mockTrackScreen = jest.fn();
let mockStack: jest.Mock;
let mockStackScreen: jest.Mock;
const mockToastManager = jest.fn(() => null);

jest.mock("expo-router", () => {
  const React = require("react");

  mockStack = jest.fn(({ children }: { children?: React.ReactNode }) =>
    React.createElement(React.Fragment, null, children),
  );
  mockStackScreen = jest.fn(() => null);
  (mockStack as any).Screen = mockStackScreen;

  return {
    Stack: mockStack,
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

jest.mock("toastify-react-native", () => {
  const React = require("react");

  return {
    __esModule: true,
    default: (props: unknown) => {
      mockToastManager(props);
      return React.createElement(React.Fragment);
    },
  };
});

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

  test("tracks nested route path after removing group segments", () => {
    mockUseSegments.mockReturnValue(["(drawer)", "building", "room"]);

    render(<RootLayout />);

    expect(mockTrackScreen).toHaveBeenCalledWith("building/room");
  });

  test("renders stack and toast with expected configuration", () => {
    mockUseSegments.mockReturnValue([]);

    render(<RootLayout />);

    expect(mockStack).toHaveBeenCalledWith(
      expect.objectContaining({
        screenOptions: {
          headerShown: false,
          contentStyle: { backgroundColor: "#f5f2f2" },
        },
      }),
      undefined,
    );

    expect(mockStackScreen).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({ name: "index" }),
      undefined,
    );
    expect(mockStackScreen).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({ name: "login" }),
      undefined,
    );
    expect(mockStackScreen).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ name: "register" }),
      undefined,
    );
    expect(mockStackScreen).toHaveBeenNthCalledWith(
      4,
      expect.objectContaining({
        name: "(drawer)",
        options: { headerShown: false },
      }),
      undefined,
    );

    expect(mockToastManager).toHaveBeenCalledWith(
      expect.objectContaining({ position: "bottom" }),
    );
  });
});
