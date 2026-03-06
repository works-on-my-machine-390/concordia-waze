import { render, screen, fireEvent } from "@testing-library/react-native";
import PoiFilterBottomSheet from "../components/indoor/PoiFilterBottomSheet";
import type { Floor } from "@/hooks/queries/indoorMapQueries";

jest.mock("../components/indoor/FloorFilterChips", () => {
  return jest.fn(({ availableFloors, selectedFloor, onSelectFloor }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text>Filter by floor:</Text>
        <Pressable onPress={() => onSelectFloor(null)}>
          <Text>All Floors</Text>
        </Pressable>
        {availableFloors.map((floor: number) => (
          <Pressable
            key={floor}
            onPress={() => onSelectFloor(floor)}
          >
            <Text>Chip Floor {floor}</Text>
          </Pressable>
        ))}
      </View>
    );
  });
});

jest.mock("../components/indoor/PoiListSection", () => {
  return jest.fn(({ title, items, onPoiSelect }) => {
    const { View, Text, Pressable } = require("react-native");
    return (
      <View>
        <Text>Section: {title}</Text>
        {items.map((item: any, index: number) => (
          <Pressable
            key={`${item.name}-${index}`}
            onPress={() => onPoiSelect(item.name, item.floor)}
          >
            <Text>POI: {item.name}</Text>
          </Pressable>
        ))}
      </View>
    );
  });
});

jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  default: ({ children }: any) => {
    const { View } = require("react-native");
    return <View>{children}</View>;
  },
  BottomSheetScrollView: ({ children }: any) => {
    const { ScrollView } = require("react-native");
    return <ScrollView>{children}</ScrollView>;
  },
}));

describe("PoiFilterBottomSheet", () => {
  const mockOnPoiSelect = jest.fn();
  const mockOnClose = jest.fn();

  const mockFloors: Floor[] = [
    {
      number: 1,
      pois: [
        { name: "poi_1", type: "bathroom" },
        { name: "poi_2", type: "bathroom" },
        { name: "210", type: "room" },
      ],
    },
    {
      number: 2,
      pois: [
        { name: "poi_3", type: "bathroom" },
        { name: "220", type: "room" },
      ],
    },
    {
      number: 3,
      pois: [
        { name: "310", type: "room" },
      ],
    },
  ] as Floor[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders bottom sheet with header", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Bathrooms")).toBeOnTheScreen();
  });

  test("renders FloorFilterChips with available floors", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Filter by floor:")).toBeOnTheScreen();
    expect(screen.getByText("Chip Floor 1")).toBeOnTheScreen();
    expect(screen.getByText("Chip Floor 2")).toBeOnTheScreen();
    expect(screen.queryByText("Chip Floor 3")).not.toBeOnTheScreen();
  });

  test("filters sections by POI type", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_2")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_3")).toBeOnTheScreen();

    expect(screen.queryByText("POI: 210")).not.toBeOnTheScreen();
    expect(screen.queryByText("POI: 220")).not.toBeOnTheScreen();
  });

  test("renders sections grouped by floor in ascending order", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    const sections = screen.getAllByText(/^Section: Floor \d+$/);
    expect(sections[0]).toHaveTextContent("Section: Floor 1");
    expect(sections[1]).toHaveTextContent("Section: Floor 2");
  });

  test("filters sections when floor is selected", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen(); 
    expect(screen.getByText("POI: poi_3")).toBeOnTheScreen(); 

    fireEvent.press(screen.getByText("Chip Floor 1"));

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen();
    expect(screen.queryByText("POI: poi_3")).not.toBeOnTheScreen();
  });

  test("shows all sections when 'All' filter is selected", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(screen.getByText("Chip Floor 1"));

    expect(screen.queryByText("POI: poi_3")).not.toBeOnTheScreen();

    fireEvent.press(screen.getByText("All Floors"));

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_3")).toBeOnTheScreen();
  });

  test("calls onPoiSelect when POI item is pressed", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    fireEvent.press(screen.getByText("POI: poi_1"));

    expect(mockOnPoiSelect).toHaveBeenCalledWith("poi_1", 1);
  });

  test("handles case-insensitive POI type filtering", () => {
    render(
      <PoiFilterBottomSheet
        poiType="BATHROOM"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_2")).toBeOnTheScreen();
  });

  test("renders empty when no POIs of type exist", () => {
    render(
      <PoiFilterBottomSheet
        poiType="elevator"
        poiLabel="Elevators"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.queryByText(/POI: /)).not.toBeOnTheScreen();
  });

  test("handles negative floor numbers", () => {
    const floorsWithNegative: Floor[] = [
      {
        number: -1,
        pois: [{ name: "poi_b1", type: "bathroom" }],
      },
      {
        number: 1,
        pois: [{ name: "poi_1", type: "bathroom" }],
      },
    ] as Floor[];

    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={floorsWithNegative}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Section: Floor -1")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_b1")).toBeOnTheScreen();
  });

  test("sorts sections in ascending floor order", () => {
    const unsortedFloors: Floor[] = [
      { number: 3, pois: [{ name: "poi_3", type: "bathroom" }] },
      { number: 1, pois: [{ name: "poi_1", type: "bathroom" }] },
      { number: 2, pois: [{ name: "poi_2", type: "bathroom" }] },
    ] as Floor[];

    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={unsortedFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    const sections = screen.getAllByText(/^Section: Floor \d+$/);
    expect(sections[0]).toHaveTextContent("Section: Floor 1");
    expect(sections[1]).toHaveTextContent("Section: Floor 2");
    expect(sections[2]).toHaveTextContent("Section: Floor 3");
  });

  test("passes correct props to PoiListSection", () => {
    render(
      <PoiFilterBottomSheet
        poiType="bathroom"
        poiLabel="Bathrooms"
        floors={mockFloors}
        buildingCode="MB"
        onPoiSelect={mockOnPoiSelect}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("POI: poi_1")).toBeOnTheScreen();
    expect(screen.getByText("POI: poi_2")).toBeOnTheScreen();
  });
});