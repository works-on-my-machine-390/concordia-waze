import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import AccessibilityToggle from "../components/indoor/AccessibilityToggle";

jest.mock("@/app/icons", () => ({
  WheelchairIcon: () => null,
}));

jest.mock("@/app/constants", () => ({
  COLORS: {
    surface: "#ffffff",
    accessibilityIcon: "#2563eb",
  },
}));

describe("AccessibilityToggle", () => {
  test("renders in inactive state", () => {
    const { getByRole } = renderWithProviders(
      <AccessibilityToggle isActive={false} onToggle={jest.fn()} />
    );
    const button = getByRole("button");
    expect(button).toBeTruthy();
    expect(button.props.accessibilityLabel).toBe("Enable accessibility mode");
    expect(button.props.accessibilityState).toEqual({ checked: false });
  });

  test("renders in active state", () => {
    const { getByRole, getByText } = renderWithProviders(
      <AccessibilityToggle isActive={true} onToggle={jest.fn()} />
    );
    const button = getByRole("button");
    expect(button.props.accessibilityLabel).toBe("Disable accessibility mode");
    expect(button.props.accessibilityState).toEqual({ checked: true });
    expect(getByText("Accessible")).toBeTruthy();
  });

  test("calls onToggle when pressed", () => {
    const onToggle = jest.fn();
    const { getByRole } = renderWithProviders(
      <AccessibilityToggle isActive={false} onToggle={onToggle} />
    );
    fireEvent.press(getByRole("button"));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  test("does not show Accessible label when inactive", () => {
    const { queryByText } = renderWithProviders(
      <AccessibilityToggle isActive={false} onToggle={jest.fn()} />
    );
    expect(queryByText("Accessible")).toBeNull();
  });
});