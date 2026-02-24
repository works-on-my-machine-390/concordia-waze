/**
 * Tests for NavigationHeader component
 */
import { NavigationHeader } from "@/components/NavigationHeader";
import { render } from "@testing-library/react-native";

// Mock the icons
jest.mock("../app/icons", () => ({
  CircleIcon: "CircleIcon",
  LocationIcon: "LocationIcon",
}));

describe("NavigationHeader", () => {
  const mockOnCancel = jest.fn();

  const defaultProps = {
    startLocation: "Current Location",
    endLocation: "H - Hall Building",
    onCancel: mockOnCancel,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders start location text correctly", () => {
    const { getByText } = render(<NavigationHeader {...defaultProps} />);
    expect(getByText("From")).toBeTruthy();
    expect(getByText("Current Location")).toBeTruthy();
  });

  test("renders end location text correctly", () => {
    const { getByText } = render(<NavigationHeader {...defaultProps} />);
    expect(getByText("To")).toBeTruthy();
    expect(getByText("H - Hall Building")).toBeTruthy();
  });

  test("displays building code and name format correctly", () => {
    const { getByText } = render(
      <NavigationHeader
        {...defaultProps}
        endLocation="EV - Engineering Building"
      />,
    );
    expect(getByText("EV - Engineering Building")).toBeTruthy();
  });

  test("displays address format correctly when user is outside building", () => {
    const address = "1455 De Maisonneuve Blvd W, Montreal, QC, H3G 1M8";
    const { getByText } = render(
      <NavigationHeader {...defaultProps} startLocation={address} />,
    );
    expect(getByText(address)).toBeTruthy();
  });

  test("displays coordinates format correctly", () => {
    const coords = "45.49720, -73.57910";
    const { getByText } = render(
      <NavigationHeader {...defaultProps} startLocation={coords} />,
    );
    expect(getByText(coords)).toBeTruthy();
  });

  test("renders both From and To labels", () => {
    const { getAllByText } = render(<NavigationHeader {...defaultProps} />);
    expect(getAllByText(/From|To/).length).toBeGreaterThanOrEqual(2);
  });

  test("handles empty start location", () => {
    const { getByText } = render(
      <NavigationHeader {...defaultProps} startLocation="" />,
    );
    expect(getByText("From")).toBeTruthy();
  });

  test("handles empty end location", () => {
    const { getByText } = render(
      <NavigationHeader {...defaultProps} endLocation="" />,
    );
    expect(getByText("To")).toBeTruthy();
  });

  test("handles very long location names without crashing", () => {
    const longLocation = "A".repeat(200);
    const { getByText } = render(
      <NavigationHeader {...defaultProps} endLocation={longLocation} />,
    );
    expect(getByText(longLocation)).toBeTruthy();
  });

  test("handles special characters in location names", () => {
    const specialLocation = "Café René-Lévesque, Montréal, QC";
    const { getByText } = render(
      <NavigationHeader {...defaultProps} startLocation={specialLocation} />,
    );
    expect(getByText(specialLocation)).toBeTruthy();
  });

  test("renders with building name as start location when user is in a building", () => {
    const { getByText } = render(
      <NavigationHeader
        startLocation="H - Hall Building"
        endLocation="EV - Engineering Building"
        onCancel={mockOnCancel}
      />,
    );
    expect(getByText("H - Hall Building")).toBeTruthy();
    expect(getByText("EV - Engineering Building")).toBeTruthy();
  });

  test("component renders without crashing with minimal props", () => {
    const { getByText } = render(
      <NavigationHeader
        startLocation="Start"
        endLocation="End"
        onCancel={mockOnCancel}
      />,
    );
    expect(getByText("Start")).toBeTruthy();
    expect(getByText("End")).toBeTruthy();
  });
});
