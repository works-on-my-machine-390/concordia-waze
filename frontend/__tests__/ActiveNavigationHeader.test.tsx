import { render } from "@testing-library/react-native";
import { usePathname } from "expo-router";
import ActiveNavigationHeader from "../components/activeNavigation/ActiveNavigationHeader";

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 12, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-router", () => ({
  usePathname: jest.fn(),
}));

jest.mock("../components/activeNavigation/ActiveNavigationIndoorHeaderContent", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockIndoorHeader() {
    return React.createElement(Text, null, "Indoor header content");
  };
});

jest.mock("../components/activeNavigation/ActiveNavigationOutdoorHeaderContent", () => {
  const React = require("react");
  const { Text } = require("react-native");
  return function MockOutdoorHeader() {
    return React.createElement(Text, null, "Outdoor header content");
  };
});

describe("ActiveNavigationHeader", () => {
  const mockedUsePathname = usePathname as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders indoor header content on indoor map route", () => {
    mockedUsePathname.mockReturnValue("/indoor-map");

    const { getByText, queryByText } = render(<ActiveNavigationHeader />);

    expect(getByText("Indoor header content")).toBeTruthy();
    expect(queryByText("Outdoor header content")).toBeNull();
  });

  test("renders outdoor header content on map route", () => {
    mockedUsePathname.mockReturnValue("/map");

    const { getByText, queryByText } = render(<ActiveNavigationHeader />);

    expect(getByText("Outdoor header content")).toBeTruthy();
    expect(queryByText("Indoor header content")).toBeNull();
  });

  test("renders no active header content on other routes", () => {
    mockedUsePathname.mockReturnValue("/search");

    const { queryByText } = render(<ActiveNavigationHeader />);

    expect(queryByText("Indoor header content")).toBeNull();
    expect(queryByText("Outdoor header content")).toBeNull();
  });
});
