import { render, screen, fireEvent } from "@testing-library/react-native";
import FloorFilterChips from "../components/indoor/FloorFilterChips";

describe("FloorFilterChips", () => {
  const mockOnSelectFloor = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders null when only one floor is available", () => {
    const { toJSON } = render(
      <FloorFilterChips
        availableFloors={[1]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it("renders null when no floors are available", () => {
    const { toJSON } = render(
      <FloorFilterChips
        availableFloors={[]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(toJSON()).toBeNull();
  });

  it("renders filter chips when multiple floors are available", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(screen.getByText("Filter by floor:")).toBeOnTheScreen();
    expect(screen.getByText("All")).toBeOnTheScreen();
    expect(screen.getByText("1")).toBeOnTheScreen();
    expect(screen.getByText("2")).toBeOnTheScreen();
    expect(screen.getByText("3")).toBeOnTheScreen();
  });

  it("displays floors in the order provided", () => {
    render(
      <FloorFilterChips
        availableFloors={[3, 1, 2]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(screen.getByText("All")).toBeOnTheScreen();
    expect(screen.getByText("3")).toBeOnTheScreen();
    expect(screen.getByText("1")).toBeOnTheScreen();
    expect(screen.getByText("2")).toBeOnTheScreen();
  });

  it("calls onSelectFloor with null when 'All' is pressed", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2]}
        selectedFloor={1}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    fireEvent.press(screen.getByText("All"));

    expect(mockOnSelectFloor).toHaveBeenCalledWith(null);
    expect(mockOnSelectFloor).toHaveBeenCalledTimes(1);
  });

  it("calls onSelectFloor with floor number when floor chip is pressed", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    fireEvent.press(screen.getByText("2"));

    expect(mockOnSelectFloor).toHaveBeenCalledWith(2);
    expect(mockOnSelectFloor).toHaveBeenCalledTimes(1);
  });

  it("applies active text style to 'All' chip when selectedFloor is null", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    const allText = screen.getByText("All");
    expect(allText).toHaveStyle({ color: "white" });
  });

  it("applies active text style to selected floor chip", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={2}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    const chip2Text = screen.getByText("2");
    expect(chip2Text).toHaveStyle({ color: "white" });
  });

  it("applies inactive text style to non-selected chips", () => {
    render(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={2}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    const allText = screen.getByText("All");
    const chip1Text = screen.getByText("1");
    const chip3Text = screen.getByText("3");

    expect(allText).not.toHaveStyle({ color: "white" });
    expect(chip1Text).not.toHaveStyle({ color: "white" });
    expect(chip3Text).not.toHaveStyle({ color: "white" });
  });

  it("handles negative floor numbers", () => {
    render(
      <FloorFilterChips
        availableFloors={[-1, 0, 1]}
        selectedFloor={null}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(screen.getByText("-1")).toBeOnTheScreen();
    expect(screen.getByText("0")).toBeOnTheScreen();
    expect(screen.getByText("1")).toBeOnTheScreen();

    fireEvent.press(screen.getByText("-1"));
    expect(mockOnSelectFloor).toHaveBeenCalledWith(-1);
  });

  it("handles switching between floor selections", () => {
    const { rerender } = render(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={1}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(screen.getByText("1")).toHaveStyle({ color: "white" });
    expect(screen.getByText("2")).not.toHaveStyle({ color: "white" });

    fireEvent.press(screen.getByText("2"));
    expect(mockOnSelectFloor).toHaveBeenCalledWith(2);

    rerender(
      <FloorFilterChips
        availableFloors={[1, 2, 3]}
        selectedFloor={2}
        onSelectFloor={mockOnSelectFloor}
      />
    );

    expect(screen.getByText("2")).toHaveStyle({ color: "white" });
    expect(screen.getByText("1")).not.toHaveStyle({ color: "white" });
  });
});