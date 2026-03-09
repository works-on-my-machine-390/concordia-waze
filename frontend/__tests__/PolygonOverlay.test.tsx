import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import PolygonOverlay from "../components/indoor/PolygonOverlay";

jest.mock("../components/indoor/RoomPolygon", () => {
  const { Pressable, Text } = require("react-native");
  return function MockRoomPolygon({ polygon, width, height, isSelected, onPress }: any) {
    return (
      <Pressable testID="room-polygon" onPress={onPress}>
        <Text>
          {polygon.length} points, {width}x{height}
          {isSelected && " (selected)"}
        </Text>
      </Pressable>
    );
  };
});

const createPoiWithPolygon = (
  name: string,
  pointCount: number,
): PointOfInterest => ({
  name,
  type: "room",
  position: { x: 0.5, y: 0.5 },
  polygon: Array.from({ length: pointCount }, (_, i) => ({
    x: i * 0.1,
    y: i * 0.1,
  })),
});

const createPoiWithoutPolygon = (name: string): PointOfInterest => ({
  name,
  type: "room",
  position: { x: 0.5, y: 0.5 },
  polygon: [],
});

describe("PolygonOverlay", () => {
  const defaultProps = {
    width: 1000,
    height: 1000,
  };

  test("renders nothing when pois array is empty", () => {
    const { queryAllByTestId } = renderWithProviders(
      <PolygonOverlay pois={[]} {...defaultProps} />,
    );

    expect(queryAllByTestId("room-polygon")).toHaveLength(0);
  });

  test("filters out POIs without polygons", () => {
    const pois = [
      createPoiWithPolygon("Room 1", 4),
      createPoiWithoutPolygon("Room 2"),
      createPoiWithPolygon("Room 3", 4),
    ];

    const { queryAllByTestId } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(queryAllByTestId("room-polygon")).toHaveLength(2);
  });

  test("renders all POIs with polygons", () => {
    const pois = [
      createPoiWithPolygon("Room 1", 4),
      createPoiWithPolygon("Room 2", 5),
      createPoiWithPolygon("Room 3", 6),
    ];

    const { queryAllByTestId } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(queryAllByTestId("room-polygon")).toHaveLength(3);
  });

  test("passes correct width and height to RoomPolygon", () => {
    const pois = [createPoiWithPolygon("Room 1", 4)];

    const { getByText } = renderWithProviders(
      <PolygonOverlay pois={pois} width={500} height={800} />,
    );

    expect(getByText("4 points, 500x800")).toBeTruthy();
  });

  test("passes polygon data to RoomPolygon", () => {
    const pois = [createPoiWithPolygon("Room 1", 6)];

    const { getByText } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(getByText("6 points, 1000x1000")).toBeTruthy();
  });

  test("handles mixed POIs with and without polygons", () => {
    const pois = [
      createPoiWithoutPolygon("Empty 1"),
      createPoiWithPolygon("Room 1", 4),
      createPoiWithoutPolygon("Empty 2"),
      createPoiWithoutPolygon("Empty 3"),
      createPoiWithPolygon("Room 2", 5),
    ];

    const { queryAllByTestId } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(queryAllByTestId("room-polygon")).toHaveLength(2);
  });

  test("renders multiple polygons with different point counts", () => {
    const pois = [
      createPoiWithPolygon("Triangle", 3),
      createPoiWithPolygon("Square", 4),
      createPoiWithPolygon("Pentagon", 5),
    ];

    const { getByText } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(getByText("3 points, 1000x1000")).toBeTruthy();
    expect(getByText("4 points, 1000x1000")).toBeTruthy();
    expect(getByText("5 points, 1000x1000")).toBeTruthy();
  });

  test("does not render POIs with empty polygon arrays", () => {
    const pois = [
      createPoiWithoutPolygon("Empty 1"),
      createPoiWithoutPolygon("Empty 2"),
      createPoiWithoutPolygon("Empty 3"),
    ];

    const { queryAllByTestId } = renderWithProviders(
      <PolygonOverlay pois={pois} {...defaultProps} />,
    );

    expect(queryAllByTestId("room-polygon")).toHaveLength(0);
  });

  test("calls onSelectPoi with poi name when polygon is pressed", () => {
    const pois = [
      createPoiWithPolygon("Room 101", 4),
      createPoiWithPolygon("Room 102", 5),
    ];
    const mockOnSelectPoi = jest.fn();

    const { getAllByTestId } = renderWithProviders(
      <PolygonOverlay
        pois={pois}
        {...defaultProps}
        onSelectPoi={mockOnSelectPoi}
      />,
    );

    const polygons = getAllByTestId("room-polygon");
    expect(polygons).toHaveLength(2);

    // Press the first polygon
    fireEvent.press(polygons[0]);
    expect(mockOnSelectPoi).toHaveBeenCalledWith("Room 101");
    expect(mockOnSelectPoi).toHaveBeenCalledTimes(1);

    // Press the second polygon
    fireEvent.press(polygons[1]);
    expect(mockOnSelectPoi).toHaveBeenCalledWith("Room 102");
    expect(mockOnSelectPoi).toHaveBeenCalledTimes(2);
  });

  test("passes isSelected prop correctly to RoomPolygon", () => {
    const pois = [
      createPoiWithPolygon("Room 101", 4),
      createPoiWithPolygon("Room 102", 5),
    ];

    const { getByText } = renderWithProviders(
      <PolygonOverlay
        pois={pois}
        {...defaultProps}
        selectedPoiName="Room 101"
      />,
    );

    expect(getByText("4 points, 1000x1000 (selected)")).toBeTruthy();
    expect(getByText("5 points, 1000x1000")).toBeTruthy();
  });
});
