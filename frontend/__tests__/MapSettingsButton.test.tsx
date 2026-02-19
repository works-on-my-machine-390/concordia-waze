/**
 * Tests for MapSettingsButton component
 */

import { fireEvent, render } from "@testing-library/react-native";
import MapSettingsButton from "@/components/MapSettingsButton";

// Mock Entypo icon
jest.mock("@expo/vector-icons/Entypo", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: (props: any) => <View testID="entypo-icon" {...props} />,
  };
});

describe("MapSettingsButton", () => {
  test("renders button correctly", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<MapSettingsButton onPress={mockOnPress} />);

    const button = getByRole("button");
    expect(button).toBeTruthy();
  });

  test("calls onPress when button is pressed", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<MapSettingsButton onPress={mockOnPress} />);

    const button = getByRole("button");
    fireEvent.press(button);

    expect(mockOnPress).toHaveBeenCalledTimes(1);
  });

  test("has the correct accessibility label", () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(<MapSettingsButton onPress={mockOnPress} />);

    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Open map settings");
  });

  test("renders icon component", () => {
    const mockOnPress = jest.fn();
    const { getByTestId } = render(<MapSettingsButton onPress={mockOnPress} />);

    expect(getByTestId("entypo-icon")).toBeTruthy();
  });
});
