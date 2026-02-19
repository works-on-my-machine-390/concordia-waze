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
jest.mock("@react-navigation/native", () => {
  const actual = jest.requireActual("@react-navigation/native");
  return {
    ...actual,
    DrawerActions: actual.DrawerActions,
    useNavigation: () => ({ dispatch: mockDispatch }),
  };
});

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  useNavigation: () => ({ dispatch: mockDispatch }),
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

  test("typing in the search input calls onSearchTextChange", () => {
    const { getByPlaceholderText } = render(<MapHeader {...baseProps} />);

    const input = getByPlaceholderText("Where to…");
    fireEvent.changeText(input, "Hall building");

    expect(baseProps.onSearchTextChange).toHaveBeenCalledWith("Hall building");
  });

  test("submitting search calls onSubmitSearch with current searchText", () => {
    const props = { ...baseProps, searchText: "JMSB" };
    const { getByPlaceholderText } = render(<MapHeader {...props} />);

    const input = getByPlaceholderText("Where to…");
    fireEvent(input, "submitEditing");

    expect(props.onSubmitSearch).toHaveBeenCalledWith("JMSB");
  });

  test("pressing SGW calls onCampusChange(SGW)", () => {
    const { getByText } = render(<MapHeader {...baseProps} campus={CampusCode.LOY} />);

    fireEvent.press(getByText("SGW"));
    expect(baseProps.onCampusChange).toHaveBeenCalledWith(CampusCode.SGW);
  });

  test("pressing Loyola calls onCampusChange(LOY)", () => {
    const { getByText } = render(<MapHeader {...baseProps} campus={CampusCode.SGW} />);

    fireEvent.press(getByText("Loyola"));
    expect(baseProps.onCampusChange).toHaveBeenCalledWith(CampusCode.LOY);
  });

  test("pressing building button navigates to /search with campus param", () => {
    const { getByText } = render(<MapHeader {...baseProps} campus={CampusCode.SGW} />);

    const businessIcon = getByText("business");
    fireEvent.press((businessIcon as any).parent);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/search",
      params: { campus: CampusCode.SGW },
    });
  });
});
