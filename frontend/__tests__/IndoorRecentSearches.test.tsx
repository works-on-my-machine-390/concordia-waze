import { render, screen, fireEvent } from "@testing-library/react-native";
import IndoorRecentSearches from "../components/indoor/IndoorRecentSearches";
import type { RecentIndoorSearch } from "@/hooks/useIndoorSearch";

describe("IndoorRecentSearches", () => {
  const mockOnSearchPress = jest.fn();
  const mockOnClearPress = jest.fn();

  const mockSearches: RecentIndoorSearch[] = [
    { displayName: "MB210", floor: 2 },
    { displayName: "H892", floor: 8 },
    { displayName: "Bathroom", floor: 1 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders recent searches section header", () => {
    render(
      <IndoorRecentSearches
        searches={mockSearches}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("Recent searches")).toBeOnTheScreen();
    expect(screen.getByText("Clear")).toBeOnTheScreen();
  });

  it("renders all search items with display name and floor", () => {
    render(
      <IndoorRecentSearches
        searches={mockSearches}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("MB210")).toBeOnTheScreen();
    expect(screen.getByText("Floor 2")).toBeOnTheScreen();

    expect(screen.getByText("H892")).toBeOnTheScreen();
    expect(screen.getByText("Floor 8")).toBeOnTheScreen();

    expect(screen.getByText("Bathroom")).toBeOnTheScreen();
    expect(screen.getByText("Floor 1")).toBeOnTheScreen();
  });

  it("calls onClearPress when Clear button is pressed", () => {
    render(
      <IndoorRecentSearches
        searches={mockSearches}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    fireEvent.press(screen.getByText("Clear"));

    expect(mockOnClearPress).toHaveBeenCalledTimes(1);
  });

  it("renders empty list when no searches provided", () => {
    render(
      <IndoorRecentSearches
        searches={[]}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("Recent searches")).toBeOnTheScreen();
    expect(screen.getByText("Clear")).toBeOnTheScreen();

    // Should not render any search items
    expect(screen.queryByText("MB210")).not.toBeOnTheScreen();
    expect(screen.queryByText("Floor 2")).not.toBeOnTheScreen();
  });

  it("handles negative floor numbers", () => {
    const searchesWithNegative: RecentIndoorSearch[] = [
      { displayName: "Parking", floor: -1 },
      { displayName: "Storage", floor: -2 },
    ];

    render(
      <IndoorRecentSearches
        searches={searchesWithNegative}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("Floor -1")).toBeOnTheScreen();
    expect(screen.getByText("Floor -2")).toBeOnTheScreen();
  });

  it("handles zero floor number", () => {
    const searchWithZero: RecentIndoorSearch[] = [
      { displayName: "Ground Level", floor: 0 },
    ];

    render(
      <IndoorRecentSearches
        searches={searchWithZero}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("Floor 0")).toBeOnTheScreen();
  });

  it("renders searches in the order provided", () => {
    render(
      <IndoorRecentSearches
        searches={mockSearches}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    const items = screen.getAllByText(/MB210|H892|Bathroom/);
    
    expect(items[0]).toHaveTextContent("MB210");
    expect(items[1]).toHaveTextContent("H892");
    expect(items[2]).toHaveTextContent("Bathroom");
  });

  it("handles duplicate display names on different floors", () => {
    const duplicateSearches: RecentIndoorSearch[] = [
      { displayName: "Bathroom", floor: 1 },
      { displayName: "Bathroom", floor: 2 },
      { displayName: "Bathroom", floor: 3 },
    ];

    render(
      <IndoorRecentSearches
        searches={duplicateSearches}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getAllByText("Bathroom")).toHaveLength(3);
    expect(screen.getByText("Floor 1")).toBeOnTheScreen();
    expect(screen.getByText("Floor 2")).toBeOnTheScreen();
    expect(screen.getByText("Floor 3")).toBeOnTheScreen();
  });

  it("handles long display names", () => {
    const longNameSearch: RecentIndoorSearch[] = [
      { displayName: "Very Long Room Name That Might Wrap", floor: 5 },
    ];

    render(
      <IndoorRecentSearches
        searches={longNameSearch}
        onSearchPress={mockOnSearchPress}
        onClearPress={mockOnClearPress}
      />
    );

    expect(screen.getByText("Very Long Room Name That Might Wrap")).toBeOnTheScreen();
    expect(screen.getByText("Floor 5")).toBeOnTheScreen();
  });
});