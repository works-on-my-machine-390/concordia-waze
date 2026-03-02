import type { Coordinate } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import RoomPolygon from "../components/indoor/RoomPolygon";

describe("RoomPolygon", () => {
  const defaultProps = {
    width: 1000,
    height: 1000,
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

    expect(getByTestId("svg")).toBeTruthy();
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

    expect(getByTestId("svg")).toBeTruthy();
    expect(getByTestId("polygon")).toBeTruthy();
  });

  test("converts normalized coordinates to pixel coordinates", () => {
    const polygon: Coordinate[] = [
      { x: 0.0, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 0.5, y: 1.0 },
    ];

    const { getByLabelText } = renderWithProviders(
      <RoomPolygon polygon={polygon} width={1000} height={800} />,
    );

    expect(getByLabelText("polygon-0,0 1000,0 500,800")).toBeTruthy();
  });

  test("uses correct SVG dimensions", () => {
    const polygon: Coordinate[] = [
      { x: 0.1, y: 0.1 },
      { x: 0.2, y: 0.2 },
      { x: 0.3, y: 0.3 },
    ];

    const { getByLabelText } = renderWithProviders(
      <RoomPolygon polygon={polygon} width={500} height={600} />,
    );

    expect(getByLabelText("svg-500x600")).toBeTruthy();
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
});
