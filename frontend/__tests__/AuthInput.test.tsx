/**
 * Tests for AuthInput component
 */

import AuthInput from "@/components/AuthInput";
import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";

describe("AuthInput", () => {
  const labelText = "Email";
  const placeholderText = "you@live.concordia.ca";

  test("renders the label when provided", () => {
    const { getByText } = render(
      <AuthInput label={labelText} value="" onChange={() => {}} />
    );
    getByText(labelText);
  });

  test("renders placeholder text", () => {
    const { getByPlaceholderText } = render(
      <AuthInput placeholder={placeholderText} value="" onChange={() => {}} />
    );
    getByPlaceholderText(placeholderText);
  });

  test("calls onChange when typing", () => {
    const mockOnChange = jest.fn();
    const { getByPlaceholderText } = render(
      <AuthInput placeholder={placeholderText} value="" onChange={mockOnChange} />
    );
    const input = getByPlaceholderText(placeholderText);

    fireEvent.changeText(input, "test@concordia.ca");
    expect(mockOnChange).toHaveBeenCalledWith("test@concordia.ca");
  });

  test("renders an error message if provided", () => {
    const errorMessage = "Invalid email";
    const { getByText } = render(
      <AuthInput value="" onChange={() => {}} error={errorMessage} />
    );
    getByText(errorMessage);
  });

  test("renders right element if provided", () => {
    const rightElement = <Text testID="right-element">Right</Text>;
    const { getByTestId } = render(
      <AuthInput value="" onChange={() => {}} right={rightElement} />
    );
    getByTestId("right-element");
  });

  test("secureTextEntry works", () => {
    const { getByPlaceholderText } = render(
      <AuthInput
        placeholder={placeholderText}
        value="password"
        onChange={() => {}}
        secureTextEntry
      />
    );
    const input = getByPlaceholderText(placeholderText);
    expect(input.props.secureTextEntry).toBe(true);
  });
});
