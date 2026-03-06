import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import IndoorMapHeader from "../components/indoor/IndoorMapHeader";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation } from "expo-router";

jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
}));

jest.mock("../app/icons", () => {
  const { TouchableOpacity, View } = require("react-native");
  return {
    MenuIcon: ({ onPress }: any) => (
      <TouchableOpacity onPress={onPress} testID="menu-icon">
        <View />
      </TouchableOpacity>
    ),
  };
});

jest.mock("@/components/shared/SearchPill", () => {
  const { TouchableOpacity, Text } = require("react-native");
  return function MockSearchPill({ value, placeholder, onPress, onClear }: any) {
    return (
      <TouchableOpacity onPress={onPress} testID="search-pill">
        <Text>{value || placeholder}</Text>
        {value && (
          <TouchableOpacity onPress={onClear} testID="search-clear">
            <Text>Clear</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };
});

jest.mock("@/components/indoor/AccessibilityToggle", () => ({
  __esModule: true,
  default: () => null,
}));

describe("IndoorMapHeader", () => {
  const mockNavigation = {
    dispatch: jest.fn(),
  };

  const defaultProps = {
    searchText: "",
    onSearchPress: jest.fn(),
    onSearchClear: jest.fn(),
    onBackToOutdoor: jest.fn(),
    isAccessibilityMode: false,
    onAccessibilityToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useNavigation as jest.Mock).mockReturnValue(mockNavigation);
  });

  test("renders all header elements", () => {
    const { getByTestId, getByText } = renderWithProviders(
      <IndoorMapHeader {...defaultProps} />
    );
    expect(getByTestId("menu-icon")).toBeTruthy();
    expect(getByTestId("search-pill")).toBeTruthy();
    expect(getByText("Search rooms...")).toBeTruthy();
  });

  test("opens drawer when menu icon is pressed", () => {
    const { getByTestId } = renderWithProviders(<IndoorMapHeader {...defaultProps} />);
    fireEvent.press(getByTestId("menu-icon"));
    expect(mockNavigation.dispatch).toHaveBeenCalledWith(DrawerActions.openDrawer());
  });

  test("calls onSearchPress when search pill is pressed", () => {
    const onSearchPress = jest.fn();
    const { getByTestId } = renderWithProviders(
      <IndoorMapHeader {...defaultProps} onSearchPress={onSearchPress} />
    );
    fireEvent.press(getByTestId("search-pill"));
    expect(onSearchPress).toHaveBeenCalledTimes(1);
  });
});