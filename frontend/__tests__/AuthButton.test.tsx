/**
 * Tests for AuthButton component
 */

import AuthButton from "@/components/AuthButton";
import { act, fireEvent, render } from "@testing-library/react-native";

describe("AuthButton", () => {
  // Tests for default auth button
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
    const { getByRole } = render(
      <AuthButton title="Sign In" onPress={mockOnPress} />,
    );
    const button = getByRole("button");
    act(() => {
      fireEvent.press(button);
    });
    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("Button shows loading indicator when 'loading' prop is true", () => {
    const { queryByText, getByRole } = render(
      <AuthButton title="Sign In" loading />,
    );
    const buttonText = queryByText("Sign In");
    expect(buttonText).toBeNull();
    const button = getByRole("button");
    expect(button).toBeTruthy();
  });

  // Tests for menu auth button
  test("Menu variant shows 'Login' when user is logged out", () => {
    const { getByText } = render(
      <AuthButton variant="menu" loggedIn={false} />,
    );

    expect(getByText("Login")).toBeTruthy();
  });

  test("Menu variant shows 'Log out' when user is logged in", () => {
    const { getByText } = render(<AuthButton variant="menu" loggedIn />);

    expect(getByText("Log out")).toBeTruthy();
  });

  test("Menu variant calls onPress when pressed", () => {
    const onPress = jest.fn();

    const { getByRole } = render(
      <AuthButton variant="menu" loggedIn={false} onPress={onPress} />,
    );

    act(() => {
      fireEvent.press(getByRole("button"));
    });
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("Menu variant hides text when loading is true", () => {
    const { queryByText } = render(
      <AuthButton variant="menu" loggedIn={true} loading />,
    );

    expect(queryByText("Log out")).toBeNull();
  });
});
