import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { DrawerActions } from "@react-navigation/native";
import { CampusCode } from "@/hooks/queries/buildingQueries";
import { MapHeader } from "@/components/MapHeader"; // <-- adjust if your path differs

// ---- Ionicons mock (safe: no out-of-scope Text usage) ----
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return {
    Ionicons: ({ name }: any) => React.createElement(Text, null, name),
  };
});

// ---- Navigation + router mocks ----
const mockDispatch = jest.fn();
const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ dispatch: mockDispatch }),
}));

jest.mock("@react-navigation/native", () => ({
  ...jest.requireActual("@react-navigation/native"),
  DrawerActions: jest.requireActual("@react-navigation/native").DrawerActions,
}));

describe("MapHeader", () => {
  const baseProps = {
    campus: CampusCode.SGW,
    onCampusChange: jest.fn(),
    onMenuPress: jest.fn(),
    searchText: "",
    onSearchTextChange: jest.fn(),
    onSubmitSearch: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("pressing menu triggers drawer open + onMenuPress", () => {
    const { getByText } = render(<MapHeader {...baseProps} />);

    // Icon mock renders the name as text
    const menuIcon = getByText("menu");

    // Press the wrapper Pressable (parent)
    fireEvent.press((menuIcon as any).parent);

    expect(mockDispatch).toHaveBeenCalledTimes(1);
    expect(mockDispatch).toHaveBeenCalledWith(DrawerActions.openDrawer());
    expect(baseProps.onMenuPress).toHaveBeenCalledTimes(1);
  });

  test("pressing the search bar navigates to /search with campus param", () => {
    const { getByPlaceholderText } = render(
      <MapHeader {...baseProps} campus={CampusCode.SGW} />,
    );

    // TextInput itself is non-editable and has pointerEvents="none",
    // so press the parent (search pill) container.
    const input = getByPlaceholderText("Where to…");
    fireEvent.press((input as any).parent);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search",
      params: { campus: CampusCode.SGW },
    });
  });

  test("pressing SGW calls onCampusChange(SGW)", () => {
    const { getByText } = render(
      <MapHeader {...baseProps} campus={CampusCode.LOY} />,
    );

    fireEvent.press(getByText("SGW"));
    expect(baseProps.onCampusChange).toHaveBeenCalledWith(CampusCode.SGW);
  });

  test("pressing Loyola calls onCampusChange(LOY)", () => {
    const { getByText } = render(
      <MapHeader {...baseProps} campus={CampusCode.SGW} />,
    );

    fireEvent.press(getByText("Loyola"));
    expect(baseProps.onCampusChange).toHaveBeenCalledWith(CampusCode.LOY);
  });
});

test("onMenuPress callback is optional and doesn't cause errors", () => {
  const { getByPlaceholderText } = render(
    <MapHeader
      campus="SGW"
      onCampusChange={jest.fn()}
      onMenuPress={undefined}
      searchText=""
      onSearchTextChange={jest.fn()}
    />,
  );

  const searchInput = getByPlaceholderText("Where to…");
  expect(searchInput).toBeTruthy();
});

test("changing search text does not call callback because input is read-only", () => {
  const mockOnSearchTextChange = jest.fn();

  const { getByPlaceholderText } = render(
    <MapHeader
      campus="SGW"
      onCampusChange={jest.fn()}
      onMenuPress={jest.fn()}
      searchText=""
      onSearchTextChange={mockOnSearchTextChange}
    />,
  );

  const searchInput = getByPlaceholderText("Where to…");
  fireEvent.changeText(searchInput, "Henry F. Hall");

  expect(mockOnSearchTextChange).not.toHaveBeenCalled();
});

test("search text updates when searchText prop changes", () => {
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
