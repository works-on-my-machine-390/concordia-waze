/**
 * Tests for BuildingBottomSheet
 */

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  return {
    GestureHandlerRootView: ({ children }: any) => <>{children}</>,
    Swipeable: ({ children }: any) => <>{children}</>,
    PanGestureHandler: ({ children }: any) => <>{children}</>,
    State: {},
    Directions: {},
  };
});

import { render, fireEvent, act } from "@testing-library/react-native";
import React from "react";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";

// Mock the hook
jest.mock("@/hooks/queries/buildingQueries");

// Mock BottomSheet & BottomSheetScrollView to just render children
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children }: any, ref) => (
      <View>{children}</View>
    )),
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
    WheelchairIcon: () => {
      const { View } = require("react-native");
      return <View testID="wheelchair-icon" />;
    },
    SlopeUpIcon: () => {
      const { View } = require("react-native");
      return <View testID="slope-up-icon" />;
    },
  };
});

// Mock BuildingGallery
jest.mock("../components/BuildingGallery", () => {
  return function MockBuildingGallery() {
    const { View } = require("react-native");
    return <View testID="building-gallery" />;
  };
});

describe("BuildingBottomSheet", () => {
  const mockBuilding = {
    code: "MB",
    long_name: "John Molson Building",
    address: "1450 Guy St, Montreal",
    services: ["Career Management Service", "First Stop"],
    departments: ["Accountancy", "Finance"],
    venues: ["Cafe", "Library"],
    accessibility: ["Accessible entrance", "Accessible building elevator"],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders building name, code, and address when data is loaded", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
    });

    const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
    expect(getByText("John Molson Building (MB)")).toBeTruthy();
    expect(getByText("1450 Guy St, Montreal")).toBeTruthy();
  });

  test("renders accessibility icons based on accessibility array", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
    });

    const { getByTestId, queryByTestId } = render(
      <BuildingBottomSheet buildingCode="MB" />,
    );
    expect(getByTestId("wheelchair-icon")).toBeTruthy();
    expect(getByTestId("elevator-icon")).toBeTruthy();
    expect(queryByTestId("slope-up-icon")).toBeNull(); // No ramp in accessibility array
  });

  test("renders favorite and get directions icons", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
    });

    const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
    expect(getByTestId("favorite-icon")).toBeTruthy();
    expect(getByTestId("get-directions-icon")).toBeTruthy();
  });

  test("renders building gallery and list sections when data is loaded", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
    });

    const { getByTestId, getByText } = render(
      <BuildingBottomSheet buildingCode="MB" />,
    );
    expect(getByTestId("building-gallery")).toBeTruthy();
    expect(getByText("Services")).toBeTruthy();
    expect(getByText("Career Management Service")).toBeTruthy();
    expect(getByText("Departments")).toBeTruthy();
    expect(getByText("Accountancy")).toBeTruthy();
    expect(getByText("Venues")).toBeTruthy();
  });

  test("does not render content when data is not loaded", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: null,
      isSuccess: false,
    });

    const { queryByTestId, queryByText } = render(
      <BuildingBottomSheet buildingCode="MB" />,
    );
    expect(queryByText("Services")).toBeNull();
    expect(queryByTestId("building-gallery")).toBeNull();
  });

  test("calls onClose callback when close button is pressed", async () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
    });

    const onCloseMock = jest.fn();
    const { getByTestId } = render(
      <BuildingBottomSheet buildingCode="MB" onClose={onCloseMock} />,
    );

    const closeIcon = getByTestId("close-icon");
    const touchableOpacity = (closeIcon.parent as any) || closeIcon;
    act(() => {
      fireEvent.press(touchableOpacity);
    });
    expect(onCloseMock).toHaveBeenCalled();
  });

  test("handles null buildingCode gracefully", () => {
    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: null,
      isSuccess: false,
    });

    const { queryByText } = render(<BuildingBottomSheet buildingCode={null} />);
    expect(queryByText("Services")).toBeNull();
  });
});
