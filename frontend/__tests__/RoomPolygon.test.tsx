import type { Coordinate } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import RoomPolygon from "../components/indoor/RoomPolygon";

jest.mock("react-native-svg", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    Polygon: (props: any) =>
      React.createElement(View, {
        ...props,
        testID: "polygon",
        accessibilityLabel: `polygon-${props.points}`,
        accessibilityHint: `fill:${props.fill},stroke:${props.stroke},strokeWidth:${props.strokeWidth}`,
      }),
  };
});

describe("RoomPolygon", () => {
  const defaultProps = {
    width: 1000,
    height: 1000,
    onPress: jest.fn(),
  };

  test("returns null when polygon has fewer than 3 points", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
    ];

    const { toJSON } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(toJSON()).toBeNull();
  });

  test("returns null when polygon is empty", () => {
    const polygon: Coordinate[] = [];

    const { toJSON } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(toJSON()).toBeNull();
  });

  test("returns null when polygon has exactly 1 point", () => {
    const polygon: Coordinate[] = [{ x: 0.5, y: 0.5 }];

    const { toJSON } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(toJSON()).toBeNull();
  });

  test("renders polygon with exactly 3 points", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(getByTestId("polygon")).toBeTruthy();
  });

  test("renders polygon with more than 3 points", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.9, y: 0.1 },
      { x: 0.9, y: 0.9 },
      { x: 0.1, y: 0.9 },
    ];

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(getByTestId("polygon")).toBeTruthy();
  });

  test("converts normalized coordinates to pixel coordinates", () => {
    const polygon: Coordinate[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0.5, y: 1 },
    ];

    const { getByLabelText } = renderWithProviders(
      <RoomPolygon polygon={polygon} width={1000} height={800} onPress={jest.fn()} />,
    );

    expect(getByLabelText("polygon-0,0 1000,0 500,800")).toBeTruthy();
  });

  test("scales coordinates based on dimensions", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
    ];

    const { getByLabelText } = renderWithProviders(
      <RoomPolygon polygon={polygon} width={500} height={600} onPress={jest.fn()} />,
    );

    expect(getByLabelText("polygon-50,60 100,120 150,180")).toBeTruthy();
  });

  test("applies correct polygon styling", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    const polygonElement = getByTestId("polygon");
    const hint = polygonElement.props.accessibilityHint;

    expect(hint).toContain("fill:rgba(145, 35, 56, 0.15)");
    expect(hint).toContain("stroke:#912338");
    expect(hint).toContain("strokeWidth:2");
  });

  test("formats points string correctly with multiple coordinates", () => {
    const polygon: Coordinate[] = [
      { x: 0.25, y: 0.25 },
      { x: 0.75, y: 0.25 },
      { x: 0.75, y: 0.75 },
      { x: 0.25, y: 0.75 },
    ];

    const { getByLabelText } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(
      getByLabelText("polygon-250,250 750,250 750,750 250,750"),
    ).toBeTruthy();
  });

  test("handles decimal coordinates correctly", () => {
    const polygon: Coordinate[] = [
      { x: 0.333, y: 0.666 },
      { x: 0.555, y: 0.888 },
      { x: 0.111, y: 0.222 },
    ];

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} />,
    );

    expect(getByTestId("polygon")).toBeTruthy();
  });

  test("invokes onPress on a short tap", () => {
    const onPress = jest.fn();
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} onPress={onPress} />,
    );

    const polygonElement = getByTestId("polygon");

    polygonElement.props.onResponderGrant({
      nativeEvent: { pageX: 50, pageY: 60 },
    });
    polygonElement.props.onResponderRelease({
      nativeEvent: { pageX: 55, pageY: 63 },
    });

    expect(onPress).toHaveBeenCalledTimes(1);
    nowSpy.mockRestore();
  });

  test("does not invoke onPress when movement is too large", () => {
    const onPress = jest.fn();
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1100);

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} onPress={onPress} />,
    );

    const polygonElement = getByTestId("polygon");

    polygonElement.props.onResponderGrant({
      nativeEvent: { pageX: 50, pageY: 60 },
    });
    polygonElement.props.onResponderRelease({
      nativeEvent: { pageX: 80, pageY: 95 },
    });

    expect(onPress).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  test("does not invoke onPress when press duration is too long", () => {
    const onPress = jest.fn();
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1600);

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} onPress={onPress} />,
    );

    const polygonElement = getByTestId("polygon");

    polygonElement.props.onResponderGrant({
      nativeEvent: { pageX: 50, pageY: 60 },
    });
    polygonElement.props.onResponderRelease({
      nativeEvent: { pageX: 52, pageY: 61 },
    });

    expect(onPress).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });

  test("terminating responder aborts pending tap", () => {
    const onPress = jest.fn();
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.5, y: 0.9 },
      { x: 0.9, y: 0.1 },
    ];

    const nowSpy = jest.spyOn(Date, "now");
    nowSpy.mockReturnValueOnce(1000).mockReturnValueOnce(1200);

    const { getByTestId } = renderWithProviders(
      <RoomPolygon polygon={polygon} {...defaultProps} onPress={onPress} />,
    );

    const polygonElement = getByTestId("polygon");

    polygonElement.props.onResponderGrant({
      nativeEvent: { pageX: 50, pageY: 60 },
    });
    polygonElement.props.onResponderTerminate();
    polygonElement.props.onResponderRelease({
      nativeEvent: { pageX: 51, pageY: 61 },
    });

    expect(onPress).not.toHaveBeenCalled();
    nowSpy.mockRestore();
  });
});
