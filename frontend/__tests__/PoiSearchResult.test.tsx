import { fireEvent, render } from "@testing-library/react-native";
import { TouchableOpacity } from "react-native";
import {
  getDistanceDisplayText,
  getSimplifiedAddress,
} from "@/app/utils/stringUtils";
import PoiSearchResult from "../components/poi/PoiSearchResult";

jest.mock("@/app/utils/stringUtils", () => ({
  getDistanceDisplayText: jest.fn(),
  getSimplifiedAddress: jest.fn(),
}));

jest.mock("@/app/icons", () => {
  const { View } = require("react-native");
  return {
    GetDirectionsIcon: () => <View testID="get-directions-icon" />,
  };
});

describe("PoiSearchResult", () => {
  const mockResult = {
    code: "poi-1",
    name: "Concordia Library",
    long_name: "Concordia Library",
    address: "1455 De Maisonneuve Blvd W, Montreal",
    latitude: 45.496,
    longitude: -73.579,
    metro_accessible: false,
    services: [],
    departments: null,
    venues: null,
    accessibility: null,
    distanceFromUserInMeters: 123,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getSimplifiedAddress as jest.Mock).mockReturnValue("1455 De Maisonneuve");
    (getDistanceDisplayText as jest.Mock).mockReturnValue("123 m");
  });

  test("renders name, simplified address, and distance when available", () => {
    const { getByText } = render(
      <PoiSearchResult
        result={mockResult}
        isDistanceAvailable
        onPress={jest.fn()}
        onDirectionsPress={jest.fn()}
      />,
    );

    expect(getByText("Concordia Library")).toBeTruthy();
    expect(getByText("1455 De Maisonneuve")).toBeTruthy();
    expect(getByText("123 m")).toBeTruthy();

    expect(getSimplifiedAddress).toHaveBeenCalledWith(
      "1455 De Maisonneuve Blvd W, Montreal",
    );
    expect(getDistanceDisplayText).toHaveBeenCalledWith(123);
  });

  test("does not render distance text when distance is unavailable", () => {
    const { queryByText } = render(
      <PoiSearchResult
        result={mockResult}
        isDistanceAvailable={false}
        onPress={jest.fn()}
        onDirectionsPress={jest.fn()}
      />,
    );

    expect(queryByText("123 m")).toBeNull();
    expect(getDistanceDisplayText).not.toHaveBeenCalled();
  });

  test("calls onPress with result when row is pressed", () => {
    const onPress = jest.fn();

    const { UNSAFE_getAllByType } = render(
      <PoiSearchResult
        result={mockResult}
        isDistanceAvailable
        onPress={onPress}
        onDirectionsPress={jest.fn()}
      />,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[0]);

    expect(onPress).toHaveBeenCalledWith(mockResult);
  });

  test("calls onDirectionsPress with result when directions icon is pressed", () => {
    const onDirectionsPress = jest.fn();

    const { UNSAFE_getAllByType } = render(
      <PoiSearchResult
        result={mockResult}
        isDistanceAvailable
        onPress={jest.fn()}
        onDirectionsPress={onDirectionsPress}
      />,
    );

    const touchables = UNSAFE_getAllByType(TouchableOpacity);
    fireEvent.press(touchables[1]);

    expect(onDirectionsPress).toHaveBeenCalledWith(mockResult);
  });
});
