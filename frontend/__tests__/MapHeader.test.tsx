/**
 * Tests for MapHeader component
 */
import { render, fireEvent } from "@testing-library/react-native";
import { MapHeader } from "@/components/MapHeader";
import { useNavigation, useRouter } from "expo-router";
import { DrawerActions } from "@react-navigation/native";

// Mock expo-router
jest.mock("expo-router", () => ({
  useNavigation: jest.fn(),
  useRouter: jest.fn(),
}));

// Mock @react-navigation/native
jest.mock("@react-navigation/native", () => ({
  DrawerActions: {
    openDrawer: jest.fn(() => ({ type: "OPEN_DRAWER" })),
  },
}));

describe("MapHeader", () => {
  let mockDispatch: jest.Mock;
  let mockPush: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
    mockPush = jest.fn();

    (useNavigation as jest.Mock).mockReturnValue({
      dispatch: mockDispatch,
    });

    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("SGW button is active when campus prop is 'SGW'", () => {
    const { getByText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const sgwButton = getByText("SGW");
    const loyolaButton = getByText("Loyola");

    // SGW button should have active text color (soft pink)
    expect(sgwButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#DEBDC4" })]),
    );

    // Loyola button should not be active
    expect(loyolaButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#222" })]),
    );
  });

  test("Loyola button is active when campus prop is 'Loyola'", () => {
    const { getByText } = render(
      <MapHeader
        campus="LOY"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const loyolaButton = getByText("Loyola");
    const sgwButton = getByText("SGW");

    // Loyola button should now be active (soft pink)
    expect(loyolaButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#DEBDC4" })]),
    );

    // SGW button should now be inactive (dark gray)
    expect(sgwButton.props.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ color: "#222" })]),
    );
  });

  test("Clicking SGW or Loyola button calls onCampusChange with correct value", () => {
    const mockOnCampusChange = jest.fn();

    const { getByText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={mockOnCampusChange}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const loyolaButton = getByText("Loyola");
    const sgwButton = getByText("SGW");

    fireEvent.press(loyolaButton);
    expect(mockOnCampusChange).toHaveBeenCalledWith("LOY");

    fireEvent.press(sgwButton);
    expect(mockOnCampusChange).toHaveBeenCalledWith("SGW");
  });

  test("pressing menu button dispatches DrawerActions.openDrawer and calls onMenuPress", () => {
    const mockOnMenuPress = jest.fn();

    const { getByTestId } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={mockOnMenuPress}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    // Get the menu button (first icon button with menu icon)
    const menuButton = getByTestId("menu-button");

    fireEvent.press(menuButton);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "OPEN_DRAWER" });
    expect(mockOnMenuPress).toHaveBeenCalled();
  });

  test("pressing search pill navigates to search page with campus parameter", () => {
    const { getByTestId } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const searchPill = getByTestId("search-pill");

    fireEvent.press(searchPill);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search",
      params: { campus: "SGW" },
    });
  });

  test("pressing search pill with LOY campus navigates with LOY parameter", () => {
    const { getByTestId } = render(
      <MapHeader
        campus="LOY"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const searchPill = getByTestId("search-pill");

    fireEvent.press(searchPill);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search",
      params: { campus: "LOY" },
    });
  });

  test("onMenuPress is optional and component handles undefined gracefully", () => {
    const { getByTestId } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    const menuButton = getByTestId("menu-button");

    // Should not throw error when onMenuPress is undefined
    fireEvent.press(menuButton);

    expect(mockDispatch).toHaveBeenCalledWith({ type: "OPEN_DRAWER" });
  });
});