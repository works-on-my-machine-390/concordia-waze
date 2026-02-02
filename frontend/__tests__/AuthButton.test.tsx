/**
 * Tests for AuthButton component
 */

import AuthButton from "@/components/AuthButton";
import { fireEvent, render } from "@testing-library/react-native";


describe("AuthButton", () => {
  test("Provided button title renders correctly", () => {
    const titleText = "Sign In";
    const { getByText } = render(<AuthButton title={titleText} />);
    getByText(titleText); 
  });

  test("Button is disabled when 'disabled' prop is true", () => {
    const { getByRole } = render(<AuthButton title="Sign In" disabled />);
    const button = getByRole("button");
    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  test("Provided onPress function is called when button is pressed", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<AuthButton title="Sign In" onPress={mockOnPress} />);
    const button = getByRole("button");
    fireEvent.press(button);
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("Button shows loading indicator when 'loading' prop is true", () => {
    const { queryByText, getByRole } = render(<AuthButton title="Sign In" loading />);
    const buttonText = queryByText("Sign In");
    expect(buttonText).toBeNull(); 
    const button = getByRole("button");
    expect(button).toBeTruthy(); 
  });
});
