import { fireEvent, render } from "@testing-library/react-native";
import ClassInfoDaySelector from "@/components/classes/ClassInfoDaySelector";

const mockOnSelect = jest.fn();

describe("ClassInfoDaySelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all days", () => {
    const { getByText } = render(
      <ClassInfoDaySelector selected={null} onSelect={mockOnSelect} />
    );
    getByText("MON");
    getByText("TUE");
    getByText("WED");
    getByText("THU");
    getByText("FRI");
    getByText("SAT");
    getByText("SUN");
  });

  test("calls onSelect with day when a day is pressed", () => {
    const { getByText } = render(
      <ClassInfoDaySelector selected={null} onSelect={mockOnSelect} />
    );
    fireEvent.press(getByText("MON"));
    expect(mockOnSelect).toHaveBeenCalledWith("MON");
  });

  test("calls onSelect with null when selected day is pressed again", () => {
    const { getByText } = render(
      <ClassInfoDaySelector selected="MON" onSelect={mockOnSelect} />
    );
    fireEvent.press(getByText("MON"));
    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });
});