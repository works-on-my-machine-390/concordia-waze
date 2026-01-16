import { fireEvent, render } from "@testing-library/react-native";

import TestOnlyButton, { TEST_BUTTON_DEFAULT_STYLES } from "@/components/TestOnlyButton";

describe("TestOnlyButton", () => {
  test("Provided button label renders correctly", () => {
    const labelText = "Test Button";
    const { getByText } = render(<TestOnlyButton label={labelText} />);

    getByText(labelText);
  });

  test("Button is disabled when 'disabled' prop is true", () => {
    const { getByTestId } = render(<TestOnlyButton disabled={true} />);
    const button = getByTestId("test-button");

    expect(button.props.accessibilityState.disabled).toBe(true);
  });

  test("Provided onClick function is called when button is pressed", () => {
    const mockOnClick = jest.fn();
    const { getByTestId } = render(<TestOnlyButton onClick={mockOnClick} />);
    const button = getByTestId("test-button");
    fireEvent.press(button);
    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  test("Button has correct default styles", () => {
    const { getByTestId } = render(<TestOnlyButton />);
    const button = getByTestId("test-button");

    expect(button).toHaveStyle(TEST_BUTTON_DEFAULT_STYLES);
  });
});
