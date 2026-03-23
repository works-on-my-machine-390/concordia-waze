import { render, screen, fireEvent } from "@testing-library/react-native";
import IndoorSearchResults from "../components/indoor/IndoorSearchResults";
import type { IndoorSearchResult } from "@/hooks/useIndoorSearch";
import * as formattingUtils from "@/app/utils/indoorNameFormattingUtils";

jest.mock("@/app/utils/indoorNameFormattingUtils", () => ({
  formatIndoorPoiName: jest.fn((name: string, type: string, buildingCode: string) => {
    if (type === "room") {
      return `${buildingCode}${name}`;
    }
    return name;
  }),
}));

describe("IndoorSearchResults", () => {
  const mockOnResultSelect = jest.fn();
  const buildingCode = "MB";

  const mockResults: IndoorSearchResult[] = [
    {
      poi: { name: "210", type: "room", building: "MB" },
      floor: { number: 2 },
      type: "room",
    },
    {
      poi: { name: "poi_5", type: "bathroom", building: "MB" },
      floor: { number: 1 },
      type: "poi",
    },
    {
      poi: { name: "892", type: "room", building: "MB" },
      floor: { number: 8 },
      type: "room",
    },
  ] as IndoorSearchResult[];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders all search results", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("MB210")).toBeOnTheScreen();
    expect(screen.getByText(/Floor 2/)).toBeOnTheScreen();

    expect(screen.getByText("poi_5")).toBeOnTheScreen();
    expect(screen.getByText(/Floor 1/)).toBeOnTheScreen();

    expect(screen.getByText("MB892")).toBeOnTheScreen();
    expect(screen.getByText(/Floor 8/)).toBeOnTheScreen();
  });

  it("calls formatIndoorPoiName for each result", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("210", "room", "MB");
    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("poi_5", "bathroom", "MB");
    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith("892", "room", "MB");
  });

  it("calls onResultSelect with correct params when result is pressed", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    fireEvent.press(screen.getByText("MB210"));

    expect(mockOnResultSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "210", type: "room" }),
      "MB210",
    );
    expect(mockOnResultSelect).toHaveBeenCalledTimes(1);
  });

  it("calls onResultSelect for POI results", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    fireEvent.press(screen.getByText("poi_5"));

    expect(mockOnResultSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "poi_5", type: "bathroom" }),
      "poi_5",
    );
  });

  it("renders empty state when no results provided", () => {
    render(
      <IndoorSearchResults
        results={[]}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("No rooms or POIs found")).toBeOnTheScreen();
    expect(screen.queryByText("Floor 2")).not.toBeOnTheScreen();
  });

  it("renders single result correctly", () => {
    const singleResult: IndoorSearchResult[] = [
      {
        poi: { name: "101", type: "room", building: "MB" },
        floor: { number: 1 },
        type: "room",
      },
    ] as IndoorSearchResult[];

    render(
      <IndoorSearchResults
        results={singleResult}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("MB101")).toBeOnTheScreen();
    expect(screen.getByText(/Floor 1/)).toBeOnTheScreen();
  });

  it("handles negative floor numbers", () => {
    const negativeFloorResult: IndoorSearchResult[] = [
      {
        poi: { name: "B01", type: "room", building: "MB" },
        floor: { number: -1 },
        type: "room",
      },
    ] as IndoorSearchResult[];

    render(
      <IndoorSearchResults
        results={negativeFloorResult}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText(/Floor -1/)).toBeOnTheScreen();
  });

  it("handles zero floor number", () => {
    const zeroFloorResult: IndoorSearchResult[] = [
      {
        poi: { name: "G01", type: "room", building: "MB" },
        floor: { number: 0 },
        type: "room",
      },
    ] as IndoorSearchResult[];

    render(
      <IndoorSearchResults
        results={zeroFloorResult}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText(/Floor 0/)).toBeOnTheScreen();
  });

  it("renders results in the order provided", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    const titles = screen.getAllByText(/MB210|poi_5|MB892/);
    
    expect(titles[0]).toHaveTextContent("MB210");
    expect(titles[1]).toHaveTextContent("poi_5");
    expect(titles[2]).toHaveTextContent("MB892");
  });

  it("handles multiple results on the same floor", () => {
    const sameFloorResults: IndoorSearchResult[] = [
      {
        poi: { name: "210", type: "room", building: "MB" },
        floor: { number: 2 },
        type: "room",
      },
      {
        poi: { name: "211", type: "room", building: "MB" },
        floor: { number: 2 },
        type: "room",
      },
      {
        poi: { name: "poi_3", type: "bathroom", building: "MB" },
        floor: { number: 2 },
        type: "poi",
      },
    ] as IndoorSearchResult[];

    render(
      <IndoorSearchResults
        results={sameFloorResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    const floorLabels = screen.getAllByText(/Floor 2/);
    expect(floorLabels).toHaveLength(3);
  });

  it("uses correct key for each item", () => {
    const { UNSAFE_getAllByType } = render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(screen.getByText("MB210")).toBeOnTheScreen();
    expect(screen.getByText("poi_5")).toBeOnTheScreen();
    expect(screen.getByText("MB892")).toBeOnTheScreen();
  });

  it("passes correct buildingCode to formatting function", () => {
    const customBuildingCode = "H";
    const fallbackBuildingResults: IndoorSearchResult[] = [
      {
        poi: { name: "210", type: "room" },
        floor: { number: 2 },
        type: "room",
      },
    ] as IndoorSearchResult[];
    
    render(
      <IndoorSearchResults
        results={fallbackBuildingResults}
        buildingCode={customBuildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    expect(formattingUtils.formatIndoorPoiName).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "H"
    );
  });

  it("handles pressing floor subtitle to trigger selection", () => {
    render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    const floorText = screen.getAllByText(/Floor /)[0];
    fireEvent.press(floorText);

    expect(mockOnResultSelect).toHaveBeenCalledWith(
      expect.objectContaining({ name: "210", type: "room" }),
      "MB210",
    );
  });

  it("supports keyboard interaction props", () => {
    const { UNSAFE_getByType } = render(
      <IndoorSearchResults
        results={mockResults}
        buildingCode={buildingCode}
        onResultSelect={mockOnResultSelect}
      />
    );

    const flatList = UNSAFE_getByType(require("react-native").FlatList);
    
    expect(flatList.props.keyboardShouldPersistTaps).toBe("handled");
    expect(flatList.props.keyboardDismissMode).toBe("on-drag");
  });
});