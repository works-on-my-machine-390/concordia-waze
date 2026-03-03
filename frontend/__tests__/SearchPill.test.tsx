import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import SearchPill from "../components/shared/SearchPill";

describe("SearchPill", () => {
  const defaultProps = {
    value: "",
    placeholder: "Search...",
    onPress: jest.fn(),
    onClear: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders with placeholder when value is empty", () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SearchPill {...defaultProps} />,
    );

    expect(getByPlaceholderText("Search...")).toBeTruthy();
  });

  test("renders with custom placeholder", () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SearchPill {...defaultProps} placeholder="Where to..." />,
    );

    expect(getByPlaceholderText("Where to...")).toBeTruthy();
  });

  test("displays value when provided", () => {
    const { getByDisplayValue } = renderWithProviders(
      <SearchPill {...defaultProps} value="Room 101" />,
    );

    expect(getByDisplayValue("Room 101")).toBeTruthy();
  });

  test("calls onPress when search pill is pressed", () => {
    const onPress = jest.fn();
    const { getByPlaceholderText } = renderWithProviders(
      <SearchPill {...defaultProps} onPress={onPress} />,
    );

    fireEvent.press(getByPlaceholderText("Search...").parent?.parent as any);

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("does not call onClear when main pill is pressed", () => {
    const onPress = jest.fn();
    const onClear = jest.fn();
    const { getByDisplayValue } = renderWithProviders(
      <SearchPill
        {...defaultProps}
        value="test"
        onPress={onPress}
        onClear={onClear}
      />,
    );

    fireEvent.press(getByDisplayValue("test").parent?.parent as any);

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onClear).not.toHaveBeenCalled();
  });

  test("TextInput is not editable", () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SearchPill {...defaultProps} />,
    );

    const input = getByPlaceholderText("Search...");

    expect(input.props.editable).toBe(false);
  });

  test("TextInput has pointerEvents none", () => {
    const { getByPlaceholderText } = renderWithProviders(
      <SearchPill {...defaultProps} />,
    );

    const input = getByPlaceholderText("Search...");

    expect(input.props.pointerEvents).toBe("none");
  });

  test("updates display when value changes", () => {
    const { getByDisplayValue, rerender } = renderWithProviders(
      <SearchPill {...defaultProps} value="first" />,
    );

    expect(getByDisplayValue("first")).toBeTruthy();

    rerender(<SearchPill {...defaultProps} value="second" />);

    expect(getByDisplayValue("second")).toBeTruthy();
  });
});
