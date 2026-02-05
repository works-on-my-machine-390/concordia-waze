/**
 * Tests for LocationButton component
 */
import LocationButton from "@/components/LocationButton";
import { fireEvent, render } from "@testing-library/react-native";


describe("LocationButton", () => {
  test("Button renders correctly", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<LocationButton onPress={mockOnPress} />);

    const button = getByRole("button");
    expect(button).toBeTruthy();
  });

  test("Provided onPress function is called when button is pressed", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<LocationButton onPress={mockOnPress} />);

    const button = getByRole("button");
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("Button has the correct accessibility label", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<LocationButton onPress={mockOnPress} />);

    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Go to my location");
  });
});






