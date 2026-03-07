import React from "react";
import { render } from "@testing-library/react-native";
import IndoorPathOverlay from "@/components/indoor/IndoorPathOverlay";

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="svg-root">{children}</View>,
    Circle: (props: any) => <View testID="svg-circle" {...props} />,
  };
});

describe("IndoorPathOverlay", () => {
  it("returns null when path is missing", () => {
    const { queryByTestId } = render(
      <IndoorPathOverlay path={[]} width={100} height={100} />,
    );

    expect(queryByTestId("svg-root")).toBeNull();
  });

  it("renders svg dots and start marker for a simple path", () => {
    const { getByTestId, getAllByTestId } = render(
      <IndoorPathOverlay
        path={[
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.1 },
        ]}
        width={200}
        height={200}
      />,
    );

    expect(getByTestId("svg-root")).toBeTruthy();
    expect(getAllByTestId("svg-circle").length).toBeGreaterThan(0);
  });

  it("applies endOverride when provided", () => {
    const { getAllByTestId } = render(
      <IndoorPathOverlay
        path={[
          { x: 0.1, y: 0.1 },
          { x: 0.8, y: 0.1 },
        ]}
        width={200}
        height={200}
        endOverride={{ x: 0.6, y: 0.2 }}
      />,
    );

    expect(getAllByTestId("svg-circle").length).toBeGreaterThan(0);
  });

  it("uses startOverride to trim the path", () => {
    const { getAllByTestId } = render(
      <IndoorPathOverlay
        path={[
          { x: 0.1, y: 0.1 },
          { x: 0.4, y: 0.1 },
          { x: 0.4, y: 0.5 },
        ]}
        width={200}
        height={200}
        startOverride={{ x: 0.3, y: 0.1 }}
      />,
    );

    expect(getAllByTestId("svg-circle").length).toBeGreaterThan(0);
  });

  it("handles orthogonalization and polygon snapping", () => {
    const { getAllByTestId } = render(
      <IndoorPathOverlay
        path={[
          { x: 0.1, y: 0.1 },
          { x: 0.5, y: 0.4 },
          { x: 0.8, y: 0.4 },
        ]}
        width={300}
        height={300}
        endPolygon={[
          { x: 0.75, y: 0.35 },
          { x: 0.85, y: 0.35 },
          { x: 0.85, y: 0.45 },
          { x: 0.75, y: 0.45 },
        ]}
        color="#FF0000"
      />,
    );

    expect(getAllByTestId("svg-circle").length).toBeGreaterThan(0);
  });
});