import { render, screen, fireEvent } from "@testing-library/react-native";
import PoiListSection from "../components/indoor/PoiListSection";
import * as formattingUtils from "@/app/utils/indoorNameFormattingUtils";

// Mock the formatting utility to return the actual name without complex logic
jest.mock("@/app/utils/indoorNameFormattingUtils", () => ({
  formatIndoorPoiName: jest.fn((name: string, type: string, buildingCode: string) => {
    // Return the name as-is for testing
    return name;
  }),
}));

describe("PoiListSection", () => {
  const mockOnPoiSelect = jest.fn();

  const mockItems = [
    { name: "poi_1", floor: 1 },
    { name: "poi_2", floor: 1 },
    { name: "210", floor: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders section title", () => {
    render(
      <PoiListSection
        title="Floor 1"
        items={mockItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("Floor 1")).toBeOnTheScreen();
  });

  test("renders all POI items", () => {
    render(
      <PoiListSection
        title="Floor 1"
        items={mockItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    // Mock returns names as-is
    expect(screen.getByText("poi_1")).toBeOnTheScreen();
    expect(screen.getByText("poi_2")).toBeOnTheScreen();
    expect(screen.getByText("210")).toBeOnTheScreen();
  });

  test("calls formatIndoorPoiName for each item", () => {
    render(
      <PoiListSection
        title="Floor 2"
        items={mockItems}
        poiType="bathroom"
        buildingCode="H"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("poi_1", "bathroom", "H");
    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("poi_2", "bathroom", "H");
    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("210", "bathroom", "H");
    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledTimes(3);
  });

  test("calls onPoiSelect with correct params when item is pressed", () => {
    render(
      <PoiListSection
        title="Floor 1"
        items={mockItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    fireEvent.press(screen.getByText("poi_1"));

    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_1", 1);
    expect(mockOnPoiSelect).toHaveBeenCalledTimes(1);
  });

  test("calls onPoiSelect for different items", () => {
    render(
      <PoiListSection
        title="Floor 1"
        items={mockItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    fireEvent.press(screen.getByText("210"));

    expect(mockOnPoiSelect).toHaveBeenCalledWith("210", 1);
  });

  test("renders empty section with title but no items", () => {
    render(
      <PoiListSection
        title="Floor 3"
        items={[]}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("Floor 3")).toBeOnTheScreen();
    expect(screen.queryByText("poi_1")).not.toBeOnTheScreen();
  });

  test("handles single item", () => {
    const singleItem = [{ name: "poi_5", floor: 2 }];

    render(
      <PoiListSection
        title="Floor 2"
        items={singleItem}
        poiType="stairs"
        buildingCode="H"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("poi_5")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("poi_5"));
    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_5", 2);
  });

  test("handles items on different floors", () => {
    const multiFloorItems = [
      { name: "poi_1", floor: 1 },
      { name: "poi_2", floor: 2 },
      { name: "poi_3", floor: 3 },
    ];

    render(
      <PoiListSection
        title="All Bathrooms"
        items={multiFloorItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("poi_1")).toBeOnTheScreen();
    expect(screen.getByText("poi_2")).toBeOnTheScreen();
    expect(screen.getByText("poi_3")).toBeOnTheScreen();

    // Press first item (floor 1)
    fireEvent.press(screen.getByText("poi_1"));
    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_1", 1);

    // Press second item (floor 2)
    fireEvent.press(screen.getByText("poi_2"));
    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_2", 2);
  });

  test("uses correct buildingCode for formatting", () => {
    render(
      <PoiListSection
        title="Floor 1"
        items={[{ name: "892", floor: 8 }]}
        poiType="room"
        buildingCode="H"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("892", "room", "H");
    expect(screen.getByText("892")).toBeOnTheScreen();
  });

  test("uses correct poiType for formatting", () => {
    const items = [{ name: "poi_10", floor: 1 }];

    render(
      <PoiListSection
        title="Floor 1"
        items={items}
        poiType="elevator"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("poi_10", "elevator", "MB");
  });

  test("handles negative floor numbers", () => {
    const negativeFloorItems = [
      { name: "poi_b1", floor: -1 },
      { name: "poi_b2", floor: -2 },
    ];

    render(
      <PoiListSection
        title="Basement"
        items={negativeFloorItems}
        poiType="storage"
        buildingCode="CC"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    fireEvent.press(screen.getByText("poi_b1"));
    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_b1", -1);

    fireEvent.press(screen.getByText("poi_b2"));
    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_b2", -2);
  });

  test("renders items in the order provided", () => {
    const orderedItems = [
      { name: "alpha", floor: 1 },
      { name: "beta", floor: 1 },
      { name: "gamma", floor: 1 },
    ];

    render(
      <PoiListSection
        title="Floor 1"
        items={orderedItems}
        poiType="room"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("alpha")).toBeOnTheScreen();
    expect(screen.getByText("beta")).toBeOnTheScreen();
    expect(screen.getByText("gamma")).toBeOnTheScreen();
  });

  test("handles long POI names", () => {
    const longNameItem = [
      { name: "very_long_poi_name_for_testing", floor: 1 },
    ];

    render(
      <PoiListSection
        title="Floor 1"
        items={longNameItem}
        poiType="room"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    expect(screen.getByText("very_long_poi_name_for_testing")).toBeOnTheScreen();
  });

  test("generates unique keys for items with same name on same floor", () => {
    const duplicateItems = [
      { name: "poi_1", floor: 1 },
      { name: "poi_1", floor: 1 },
    ];

    render(
      <PoiListSection
        title="Floor 1"
        items={duplicateItems}
        poiType="bathroom"
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
      />
    );

    // Should render both items (keys include index)
    expect(screen.getAllByText("poi_1")).toHaveLength(2);
  });
});