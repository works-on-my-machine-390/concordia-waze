import { fireEvent, render } from "@testing-library/react-native";
import ClassInfoTypeSelector from "@/components/classes/ClassInfoTypeSelector";

const mockOnSelect = jest.fn();

describe("ClassInfoTypeSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all types", () => {
    const { getByText } = render(
      <ClassInfoTypeSelector selected={null} onSelect={mockOnSelect} />
    );
    getByText("Lecture");
    getByText("Lab");
    getByText("Tutorial");
  });

  test("calls onSelect with type when a type is pressed", () => {
    const { getByText } = render(
      <ClassInfoTypeSelector selected={null} onSelect={mockOnSelect} />
    );
    fireEvent.press(getByText("Lecture"));
    expect(mockOnSelect).toHaveBeenCalledWith("Lecture");
  });

  test("calls onSelect with null when selected type is pressed again", () => {
    const { getByText } = render(
      <ClassInfoTypeSelector selected="Lecture" onSelect={mockOnSelect} />
    );
    fireEvent.press(getByText("Lecture"));
    expect(mockOnSelect).toHaveBeenCalledWith(null);
  });
});