/**
 * Tests for BuildingBottomSheet
 */

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  return {
    GestureHandlerRootView: ({ children }: any) => <>{children}</>,
    Swipeable: ({ children }: any) => <>{children}</>,
    PanGestureHandler: ({ children }: any) => <>{children}</>,
    State: {},
    Directions: {},
  };
});

import { render } from "@testing-library/react-native";
import React from "react";
import BuildingBottomSheet from "../components/BuildingBottomSheet";

// Mock BottomSheet & BottomSheetScrollView to just render children
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, ref) => <View>{children}</View>),
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

// Mock the icons
jest.mock("../app/icons", () => {
  const React = require("react");
  return {
    CloseIcon: () => {
      const { View } = require("react-native");
      return <View testID="close-icon" />;
    },
    ElevatorIcon: () => {
      const { View } = require("react-native");
      return <View testID="elevator-icon" />;
    },
    EscalatorIcon: () => {
      const { View } = require("react-native");
      return <View testID="escalator-icon" />;
    },
    FavoriteEmptyIcon: () => {
      const { View } = require("react-native");
      return <View testID="favorite-icon" />;
    },
    GetDirectionsIcon: () => {
      const { View } = require("react-native");
      return <View testID="get-directions-icon" />;
    },
    WheelchairIcon: () => {
      const { View } = require("react-native");
      return <View testID="wheelchair-icon" />;
    },
  };
});

describe("BuildingBottomSheet", () => {
  const mockBuilding = {
    name: "John Molson Building",
    acronym: "MB",
    address: "1450 Guy St, Montreal",
    services: ["Career Management Service", "First Stop"],
    departments: ["Accountancy", "Finance"],
    accessibility: {
      wheelchair: true,
      elevator: false,
      escalator: true,
    },
  };

  test("renders building name, acronym, and address", () => {
    const { getByText } = render(<BuildingBottomSheet building={mockBuilding} />);
    expect(getByText("John Molson Building (MB)")).toBeTruthy();
    expect(getByText("1450 Guy St, Montreal")).toBeTruthy();
  });

  test("renders accessibility icons", () => {
    const { getByTestId, queryByTestId } = render(<BuildingBottomSheet building={mockBuilding} />);
    expect(getByTestId("wheelchair-icon")).toBeTruthy();
    expect(queryByTestId("elevator-icon")).toBeNull(); // should not render because elevator is false
    expect(getByTestId("escalator-icon")).toBeTruthy();
  });

  test("renders favorite and get directions icons", () => {
    const { getByTestId } = render(<BuildingBottomSheet building={mockBuilding} />);
    expect(getByTestId("favorite-icon")).toBeTruthy();
    expect(getByTestId("get-directions-icon")).toBeTruthy();
  });

  test("renders services and departments when sheetIndex > 0", () => {
    const useStateMock: any = jest.spyOn(React, "useState");
    useStateMock.mockImplementationOnce(() => [1, jest.fn()]); // sheetIndex = 1
    useStateMock.mockImplementationOnce(() => [true, jest.fn()]); // sheetOpen = true

    const { getByText } = render(<BuildingBottomSheet building={mockBuilding} />);
    expect(getByText("Services")).toBeTruthy();
    expect(getByText("Career Management Service")).toBeTruthy();
    expect(getByText("Departments")).toBeTruthy();
    expect(getByText("Finance")).toBeTruthy();

    useStateMock.mockRestore();
  });
});