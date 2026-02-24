/**
 * Tests for MapHeader component
 */
import { MapHeader } from "@/components/MapHeader";
import { fireEvent, render } from "@testing-library/react-native";
import * as expoRouter from "expo-router";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
  useNavigation: jest.fn(),
}));

// Mock react-navigation
jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  DrawerActions: {
    openDrawer: jest.fn(),
  },
}));

describe("MapHeader", () => {
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

  test("onMenuPress callback is optional and doesn't cause errors", () => {
    // Test that we can render without onMenuPress (it's optional)
    const { getByPlaceholderText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={undefined}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    // Component should render without errors
    const searchInput = getByPlaceholderText("Where to…");
    expect(searchInput).toBeTruthy();
  });

  test("useNavigation and useRouter hooks are called during render", () => {
    const useNavigationMock = jest.spyOn(expoRouter, "useNavigation");
    const useRouterMock = jest.spyOn(expoRouter, "useRouter");

    useNavigationMock.mockReturnValue({
      dispatch: jest.fn(),
    } as any);

    useRouterMock.mockReturnValue({
      push: jest.fn(),
    } as any);

    render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    // Verify that the hooks were called to initialize the handlers
    expect(useNavigationMock).toHaveBeenCalled();
    expect(useRouterMock).toHaveBeenCalled();

    useNavigationMock.mockRestore();
    useRouterMock.mockRestore();
  });

  test("Pressing search button navigates to search page with campus param", () => {
    const mockPush = jest.fn();
    const useRouterMock = jest.spyOn(expoRouter, "useRouter");
    useRouterMock.mockReturnValue({
      push: mockPush,
    } as any);

    const useNavigationMock = jest.spyOn(expoRouter, "useNavigation");
    useNavigationMock.mockReturnValue({
      dispatch: jest.fn(),
    } as any);

    const { getByPlaceholderText } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    // The search pill (contains TextInput with placeholder "Where to…")
    const searchInput = getByPlaceholderText("Where to…");
    const searchPill = searchInput.parent;

    fireEvent.press(searchPill);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search",
      params: { campus: "SGW" },
    });

    useRouterMock.mockRestore();
    useNavigationMock.mockRestore();
  });

  test("Search text updates when searchText prop changes", () => {
    const { getByPlaceholderText, rerender } = render(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText=""
        onSearchTextChange={jest.fn()}
      />,
    );

    let searchInput = getByPlaceholderText("Where to…");
    expect(searchInput.props.value).toBe("");

    rerender(
      <MapHeader
        campus="SGW"
        onCampusChange={jest.fn()}
        onMenuPress={jest.fn()}
        searchText="Henry F. Hall"
        onSearchTextChange={jest.fn()}
      />,
    );

    searchInput = getByPlaceholderText("Where to…");
    expect(searchInput.props.value).toBe("Henry F. Hall");
  });
});
