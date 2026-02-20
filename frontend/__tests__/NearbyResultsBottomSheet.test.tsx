import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import NearbyResultsBottomSheet from "@/components/NearbyResultsBottomSheet";

/**
 * Mock Ionicons so icon names are visible as text in tests ("close", "navigate", etc.)
 * IMPORTANT: The mock factory must not reference out-of-scope variables (like Text),
 * so we require react-native inside the factory.
 */
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: any) => React.createElement(Text, null, name),
  };
});

describe("NearbyResultsBottomSheet", () => {
  const baseProps = {
    visible: true,
    loading: false,
    pois: [
      {
        id: "1",
        name: "Cafe X",
        category: "cafe",
        lat: 0,
        lon: 0,
        distanceM: 250,
      },
    ],
    sortMode: "relevance" as const,
    radiusM: 1000,
    onClose: jest.fn(),
    onChangeSort: jest.fn(),
    onChangeRadius: jest.fn(),
    onSelectPoi: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders nothing when not visible", () => {
    const { queryByText } = render(
      <NearbyResultsBottomSheet {...baseProps} visible={false} />,
    );

    expect(queryByText("Nearby results")).toBeNull();
  });

  test("shows loading indicator when loading=true", () => {
    const { UNSAFE_getByType } = render(
      <NearbyResultsBottomSheet {...baseProps} loading={true} />,
    );

    // ActivityIndicator is a native component, easiest reliable way:
    expect(() =>
      UNSAFE_getByType(require("react-native").ActivityIndicator),
    ).not.toThrow();
  });

  test("renders POI rows when loading=false", () => {
    const { getByText } = render(<NearbyResultsBottomSheet {...baseProps} />);

    expect(getByText("Cafe X")).toBeTruthy();
    expect(getByText("cafe")).toBeTruthy();
    expect(getByText("250 m")).toBeTruthy();
  });

  test("calls onSelectPoi when a POI row is pressed", () => {
    const { getByText } = render(<NearbyResultsBottomSheet {...baseProps} />);

    fireEvent.press(getByText("Cafe X"));
    expect(baseProps.onSelectPoi).toHaveBeenCalledTimes(1);
  });

  test("calls onChangeSort when sort chip is pressed", () => {
    const { getByText } = render(<NearbyResultsBottomSheet {...baseProps} />);

    // open sort menu from current chip label, then select new sort option
    fireEvent.press(getByText("Relevance"));
    fireEvent.press(getByText("Distance"));
    expect(baseProps.onChangeSort).toHaveBeenCalledWith("distance");
  });

  test("calls onChangeRadius when radius chip is pressed", () => {
    const { getByText } = render(<NearbyResultsBottomSheet {...baseProps} />);

    // open radius menu from current chip label, then select a new radius
    fireEvent.press(getByText("Within 1km"));
    fireEvent.press(getByText("Within 2km"));
    expect(baseProps.onChangeRadius).toHaveBeenCalledWith(2000);
  });

  test("calls onClose when close button is pressed", () => {
    const { getByText } = render(<NearbyResultsBottomSheet {...baseProps} />);

    // With Ionicons mocked, close icon is literally rendered as "close"
    const closeIcon = getByText("close");

    // Press the wrapper Pressable (parent)
    fireEvent.press((closeIcon as any).parent);

    expect(baseProps.onClose).toHaveBeenCalledTimes(1);
  });
});
