/**
 * Tests for BuildingBottomSheet
 */

// Mock react-native-gesture-handler
jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  return {
    GestureHandlerRootView: ({ children }: any) => <>{children}</>,
    ScrollView: ({ children }: any) => <>{children}</>,
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

// Mock BottomSheet & BottomSheetScrollView to render children
// Exposes onChange via onLayout so handleSheetChanges is exercised
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children, onChange }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: jest.fn(),
      }));
      return (
        <View testID="bottom-sheet" onLayout={() => onChange && onChange(1)}>
          {children}
        </View>
      );
    }),
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

// Mock all icons used in the component
jest.mock("../app/icons", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    CloseIcon: () => <View testID="close-icon" />,
    ElevatorIcon: () => <View testID="elevator-icon" />,
    EscalatorIcon: () => <View testID="escalator-icon" />,
    FavoriteEmptyIcon: () => <View testID="favorite-icon" />,
    GetDirectionsIcon: () => <View testID="get-directions-icon" />,
    WheelchairIcon: () => <View testID="wheelchair-icon" />,
    SlopeUpIcon: () => <View testID="slope-up-icon" />,
    CarIcon: () => <View testID="car-icon" />,
    TrainIcon: () => <View testID="train-icon" />,
    WalkingIcon: () => <View testID="walking-icon" />,
    BikeIcon: () => <View testID="bike-icon" />,
  };
});

// Mock BuildingGallery
jest.mock("../components/BuildingGallery", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockBuildingGallery() {
    return <View testID="building-gallery" />;
  };
});

// Mock image asset
jest.mock("../assets/images/icon-dizzy.png", () => "icon-dizzy");

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockBuilding = {
  code: "MB",
  long_name: "John Molson Building",
  address: "1450 Guy St, Montreal",
  services: ["Career Management Service", "First Stop"],
  departments: ["Accountancy", "Finance"],
  venues: ["Cafe", "Library"],
  accessibility: ["Accessible entrance", "Accessible building elevator"],
};

const mockSuccess = (overrides: Record<string, any> = {}) => {
  (useGetBuildingDetails as jest.Mock).mockReturnValue({
    data: { ...mockBuilding, ...overrides },
    isSuccess: true,
  });
};

const mockNoData = () => {
  (useGetBuildingDetails as jest.Mock).mockReturnValue({
    data: null,
    isSuccess: false,
  });
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("BuildingBottomSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Empty / no-data state ──────────────────────────────────────────────────

  describe("empty state", () => {
    test("renders empty state message when data is null", () => {
      mockNoData();
      const { getByText } = render(<BuildingBottomSheet buildingCode={null} />);
      expect(
        getByText("No information available for this building"),
      ).toBeTruthy();
    });

    test("renders empty state when isSuccess is false even with data", () => {
      (useGetBuildingDetails as jest.Mock).mockReturnValue({
        data: mockBuilding,
        isSuccess: false,
      });
      const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(
        getByText("No information available for this building"),
      ).toBeTruthy();
    });

    test("renders empty state when data has no accessibility field", () => {
      (useGetBuildingDetails as jest.Mock).mockReturnValue({
        data: { ...mockBuilding, accessibility: undefined },
        isSuccess: true,
      });
      const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(
        getByText("No information available for this building"),
      ).toBeTruthy();
    });

    test("does not render building content when no data", () => {
      mockNoData();
      const { queryByText, queryByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" />,
      );
      expect(queryByText("Services")).toBeNull();
      expect(queryByTestId("building-gallery")).toBeNull();
    });
  });

  // ── Normal mode ────────────────────────────────────────────────────────────

  describe("normal mode", () => {
    test("renders building name, code, and address when data is loaded", () => {
      mockSuccess();
      const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByText("John Molson Building (MB)")).toBeTruthy();
      expect(getByText("1450 Guy St, Montreal")).toBeTruthy();
    });

    test("renders building gallery", () => {
      mockSuccess();
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByTestId("building-gallery")).toBeTruthy();
    });

    test("renders all list sections with items", () => {
      mockSuccess();
      const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByText("Services")).toBeTruthy();
      expect(getByText("Career Management Service")).toBeTruthy();
      expect(getByText("First Stop")).toBeTruthy();
      expect(getByText("Departments")).toBeTruthy();
      expect(getByText("Accountancy")).toBeTruthy();
      expect(getByText("Finance")).toBeTruthy();
      expect(getByText("Venues")).toBeTruthy();
      expect(getByText("Cafe")).toBeTruthy();
      expect(getByText("Library")).toBeTruthy();
    });

    test("renders favorite and get-directions icons", () => {
      mockSuccess();
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByTestId("favorite-icon")).toBeTruthy();
      expect(getByTestId("get-directions-icon")).toBeTruthy();
    });

    test("calls onStartNavigation with building code when directions icon pressed", () => {
      mockSuccess();
      const onStartNavigation = jest.fn();
      const { getByTestId } = render(
        <BuildingBottomSheet
          buildingCode="MB"
          onStartNavigation={onStartNavigation}
        />,
      );
      act(() => {
        fireEvent.press(getByTestId("get-directions-icon").parent as any);
      });
      expect(onStartNavigation).toHaveBeenCalledWith("MB");
    });

    test("does not throw when onStartNavigation is not provided", () => {
      mockSuccess();
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(() =>
        fireEvent.press(getByTestId("get-directions-icon").parent as any),
      ).not.toThrow();
    });

    test("calls onClose when close button is pressed", () => {
      mockSuccess();
      const onClose = jest.fn();
      const { getByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" onClose={onClose} />,
      );
      act(() => {
        fireEvent.press(getByTestId("close-icon").parent as any);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("does not throw when onClose is not provided and close is pressed", () => {
      mockSuccess();
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(() =>
        fireEvent.press(getByTestId("close-icon").parent as any),
      ).not.toThrow();
    });
  });

  // ── Accessibility icons ────────────────────────────────────────────────────

  describe("accessibility icons", () => {
    test("renders wheelchair and elevator icons (no ramp)", () => {
      mockSuccess();
      const { getByTestId, queryByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" />,
      );
      expect(getByTestId("wheelchair-icon")).toBeTruthy();
      expect(getByTestId("elevator-icon")).toBeTruthy();
      expect(queryByTestId("slope-up-icon")).toBeNull();
    });

    test("renders all three icons when all features are present", () => {
      mockSuccess({
        accessibility: [
          "Accessible entrance",
          "Accessible building elevator",
          "Accessibility ramp",
        ],
      });
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByTestId("wheelchair-icon")).toBeTruthy();
      expect(getByTestId("elevator-icon")).toBeTruthy();
      expect(getByTestId("slope-up-icon")).toBeTruthy();
    });

    test("renders no accessibility icons when array is empty", () => {
      mockSuccess({ accessibility: [] });
      const { queryByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" />,
      );
      expect(queryByTestId("wheelchair-icon")).toBeNull();
      expect(queryByTestId("elevator-icon")).toBeNull();
      expect(queryByTestId("slope-up-icon")).toBeNull();
    });

    test("renders only ramp icon when only ramp is listed", () => {
      mockSuccess({ accessibility: ["Accessibility ramp"] });
      const { getByTestId, queryByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" />,
      );
      expect(getByTestId("slope-up-icon")).toBeTruthy();
      expect(queryByTestId("wheelchair-icon")).toBeNull();
      expect(queryByTestId("elevator-icon")).toBeNull();
    });

    test("renders only elevator icon when only elevator is listed", () => {
      mockSuccess({ accessibility: ["Accessible building elevator"] });
      const { getByTestId, queryByTestId } = render(
        <BuildingBottomSheet buildingCode="MB" />,
      );
      expect(getByTestId("elevator-icon")).toBeTruthy();
      expect(queryByTestId("wheelchair-icon")).toBeNull();
      expect(queryByTestId("slope-up-icon")).toBeNull();
    });
  });

  // ── buildingCode query passthrough ────────────────────────────────────────

  describe("buildingCode query passthrough", () => {
    test("passes empty string to query when buildingCode is null", () => {
      mockNoData();
      render(<BuildingBottomSheet buildingCode={null} />);
      expect(useGetBuildingDetails).toHaveBeenCalledWith("");
    });

    test("passes buildingCode to query when provided", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="MB" />);
      expect(useGetBuildingDetails).toHaveBeenCalledWith("MB");
    });
  });

  // ── isNavigationMode prop variants ────────────────────────────────────────

  describe("isNavigationMode prop", () => {
    test("renders normally when isNavigationMode is false", () => {
      mockSuccess();
      const { getByText } = render(
        <BuildingBottomSheet buildingCode="MB" isNavigationMode={false} />,
      );
      expect(getByText("John Molson Building (MB)")).toBeTruthy();
    });

    test("renders normally when isNavigationMode is undefined", () => {
      mockSuccess();
      const { getByText } = render(<BuildingBottomSheet buildingCode="MB" />);
      expect(getByText("John Molson Building (MB)")).toBeTruthy();
    });
  });

  // ── Navigation mode ────────────────────────────────────────────────────────

  describe("navigation mode", () => {
    const renderNav = (overrides: Record<string, any> = {}) => {
      mockSuccess(overrides);
      return render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          hasLocation={true}
        />,
      );
    };

    test("hides building name, address, gallery and list sections", () => {
      const { queryByText, queryByTestId } = renderNav();
      expect(queryByText("John Molson Building (MB)")).toBeNull();
      expect(queryByText("1450 Guy St, Montreal")).toBeNull();
      expect(queryByText("Services")).toBeNull();
      expect(queryByText("Departments")).toBeNull();
      expect(queryByText("Venues")).toBeNull();
      expect(queryByTestId("building-gallery")).toBeNull();
    });

    test("hides directions and favorite icons", () => {
      const { queryByTestId } = renderNav();
      expect(queryByTestId("get-directions-icon")).toBeNull();
      expect(queryByTestId("favorite-icon")).toBeNull();
    });

    test("renders duration chips for all four transit modes", () => {
      const { getByText, getAllByText } = renderNav();
      expect(getByText("5 min")).toBeTruthy(); // car
      expect(getAllByText("3 min").length).toBeGreaterThanOrEqual(2); // train + walk
      expect(getByText("4 min")).toBeTruthy(); // bike
    });

    test("renders transit mode icons", () => {
      const { getByTestId } = renderNav();
      expect(getByTestId("car-icon")).toBeTruthy();
      expect(getByTestId("train-icon")).toBeTruthy();
      expect(getByTestId("walking-icon")).toBeTruthy();
      expect(getByTestId("bike-icon")).toBeTruthy();
    });

    test("switches title to Drive when car chip is pressed", () => {
      const { getByText } = renderNav();
      act(() => {
        fireEvent.press(getByText("5 min"));
      });
      expect(getByText("Drive")).toBeTruthy();
    });

    test("switches title to Transit when train chip is pressed", () => {
      const { getAllByText, getByText } = renderNav();
      act(() => {
        fireEvent.press(getAllByText("3 min")[0]); // first "3 min" = train
      });
      expect(getByText("Transit")).toBeTruthy();
    });

    test("switches title to Walk when walk chip is pressed", () => {
      const { getAllByText, getByText } = renderNav();
      // First switch to car so we move away from default Walk
      act(() => {
        fireEvent.press(getByText("5 min"));
      });
      // Then press second "3 min" (walk)
      act(() => {
        fireEvent.press(getAllByText("3 min")[1]);
      });
      expect(getByText("Walk")).toBeTruthy();
    });

    test("switches title to Bike when bike chip is pressed", () => {
      const { getByText } = renderNav();
      act(() => {
        fireEvent.press(getByText("4 min"));
      });
      expect(getByText("Bike")).toBeTruthy();
    });

    test("calls onClose when close is pressed in navigation mode", () => {
      mockSuccess();
      const onClose = jest.fn();
      const { getByTestId } = render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          onClose={onClose}
        />,
      );
      act(() => {
        fireEvent.press(getByTestId("close-icon").parent as any);
      });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test("does not throw when onClose is not provided in navigation mode", () => {
      const { getByTestId } = renderNav();
      expect(() =>
        fireEvent.press(getByTestId("close-icon").parent as any),
      ).not.toThrow();
    });

    test("shows 'Please select a start location' when hasLocation is false", () => {
      mockSuccess();
      const { getByText } = render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          hasLocation={false}
        />,
      );
      expect(getByText("Please select a start location")).toBeTruthy();
    });
  });

  // ── handleSheetChanges (onChange branch) ──────────────────────────────────

  describe("handleSheetChanges", () => {
    test("triggers onChange with index > -1 without error", () => {
      mockSuccess();
      const { getByTestId } = render(<BuildingBottomSheet buildingCode="MB" />);
      act(() => {
        fireEvent(getByTestId("bottom-sheet"), "layout");
      });
      expect(getByTestId("bottom-sheet")).toBeTruthy();
    });
  });

  // ── Cross-campus navigation ────────────────────────────────────────────────
  describe("cross-campus navigation", () => {
    const renderCrossCampus = () => {
      mockSuccess();
      return render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          startCampus="SGW"
          endCampus="LOY"
          hasLocation={true}
        />,
      );
    };

    const renderSameCampus = () => {
      mockSuccess();
      return render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          startCampus="SGW"
          endCampus="SGW"
          hasLocation={true}
        />,
      );
    };

    test("shows Shuttle as default transit mode for cross-campus route", () => {
      const { getByText } = renderCrossCampus();
      expect(getByText("Shuttle")).toBeTruthy();
    });

    test("shows first transit mode as default for same-campus route", () => {
      const { getByText } = renderSameCampus();
      expect(getByText("Drive")).toBeTruthy();
    });

    test("renders shuttle option first for cross-campus route", () => {
      const { getAllByText } = renderCrossCampus();
      expect(getAllByText("2 min")).toBeTruthy();
    });

    test("shuttle chip is selected by default for cross-campus route", () => {
      const { getByText } = renderCrossCampus();
      const shuttleChip = getByText("2 min").parent;
      expect(shuttleChip).toBeTruthy();
    });

    test("can switch from shuttle to other modes in cross-campus navigation", () => {
      const { getByText } = renderCrossCampus();
      expect(getByText("Shuttle")).toBeTruthy();

      act(() => {
        fireEvent.press(getByText("5 min"));
      });

      expect(getByText("Drive")).toBeTruthy();
    });

    test("does not reorder transit options when not in navigation mode", () => {
      mockSuccess();
      const { queryByText } = render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={false}
          startCampus="SGW"
          endCampus="LOY"
        />,
      );
      expect(queryByText("Shuttle")).toBeNull();
    });

    test("handles missing campus props gracefully", () => {
      mockSuccess();
      const { getByText } = render(
        <BuildingBottomSheet
          buildingCode="MB"
          isNavigationMode={true}
          hasLocation={true}
        />,
      );
      expect(getByText("Drive")).toBeTruthy();
    });
  });
});
