import { fireEvent, render } from "@testing-library/react-native";
import { Animated } from "react-native";
import NextClassDrawer from "../components/classes/NextClassDrawer";
import { NextClassResponse } from "../hooks/queries/classQueries";

jest.mock("../components/classes/NextClassCard", () => {
  const { View } = require("react-native");
  return function MockNextClassCard() {
    return <View testID="next-class-card" />;
  };
});

jest.mock("../app/icons", () => ({
  DrawerOpenIcon: () => {
    const { Text } = require("react-native");
    return <Text>drawer-open</Text>;
  },
  DrawerCloseIcon: () => {
    const { Text } = require("react-native");
    return <Text>drawer-close</Text>;
  },
  TimeIcon: () => null,
  GetDirectionsIcon: () => null,
}));

const mockNextClass: NextClassResponse = {
  className: "SOEN 363",
  buildingLatitude: 0,
  buildingLongitude: 0,
  floorNumber: 0,
  roomX: 0,
  roomY: 0,
  item: {
    type: "Lecture" as const,
    section: "WW",
    day: "FRI",
    startTime: "16:00",
    endTime: "17:15",
    buildingCode: "MB",
    room: "S2.210",
    origin: "manual" as const,
  },
};

describe("NextClassDrawer", () => {
  test("renders NextClassCard", () => {
    const { getByTestId } = render(
      <NextClassDrawer nextClass={mockNextClass} />,
    );
    expect(getByTestId("next-class-card")).toBeTruthy();
  });

  test("shows open icon when closed", () => {
    const { getByText } = render(<NextClassDrawer nextClass={mockNextClass} />);
    expect(getByText("drawer-open")).toBeTruthy();
  });

  test("shows close icon after pressing", () => {
    const { getByText } = render(<NextClassDrawer nextClass={mockNextClass} />);
    fireEvent.press(getByText("drawer-open"));
    expect(getByText("drawer-close")).toBeTruthy();
  });

  test("triggers close animation when pressed while open", () => {
    const { getByText, queryByText } = render(
      <NextClassDrawer nextClass={mockNextClass} />,
    );
    fireEvent.press(getByText("drawer-open"));
    expect(getByText("drawer-close")).toBeTruthy();
    expect(queryByText("drawer-open")).toBeNull();
    fireEvent.press(getByText("drawer-close"));
    expect(getByText("drawer-close")).toBeTruthy();
  });

  test("handles layout measurement", () => {
    const { UNSAFE_getByType } = render(
      <NextClassDrawer nextClass={mockNextClass} />,
    );
    const animatedView = UNSAFE_getByType(Animated.View);
    fireEvent(animatedView, "layout", {
      nativeEvent: { layout: { width: 300 } },
    });
  });
});
