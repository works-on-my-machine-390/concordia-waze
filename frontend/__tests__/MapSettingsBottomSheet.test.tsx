/**
 * Tests for MapSettingsBottomSheet component
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

import { render, fireEvent } from "@testing-library/react-native";
import MapSettingsBottomSheet from "@/components/MapSettingsBottomSheet";
import { SettingListItem } from "@/components/MapSettingsBottomSheet";

// Mock @gorhom/bottom-sheet
jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children, onClose }: any, ref) => (
      <View testID="bottom-sheet" onTouchEnd={onClose}>
        {children}
      </View>
    )),
    BottomSheetScrollView: ({ children }: any) => (
      <View testID="bottom-sheet-scroll">{children}</View>
    ),
  };
});

// Mock BottomSheetListSection
jest.mock("@/components/BottomSheetListSection", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View>{children}</View>,
    ListSectionStyles: {
      listContainer: {},
      listTitle: {},
      listItem: {},
    },
  };
});

const mockUseMapSettings = jest.fn();

// Mock useMapSettings hook
jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  default: () => mockUseMapSettings(),
  MapSettingsList: [
    {
      key: "showShuttleStops",
      controlType: "switch",
      label: "Show Shuttle Stops",
      description: "Toggle the visibility of shuttle stops on the map.",
      defaultValue: false,
    },
    {
      key: "showBuildingPolygons",
      controlType: "switch",
      label: "Show Building Polygons",
      description:
        "Toggle the visibility of Concordia building polygons on the map.",
      defaultValue: true,
    },
  ],
}));

describe("MapSettingsBottomSheet", () => {
  const mockUpdateSetting = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseMapSettings.mockReturnValue({
      mapSettings: {
        showShuttleStops: false,
        showBuildingPolygons: true,
      },
      updateSetting: mockUpdateSetting,
    });
  });

  test("renders bottom sheet with map settings", () => {
    const { getByText } = render(<MapSettingsBottomSheet />);

    expect(getByText("Map Settings")).toBeTruthy();
    expect(getByText("Show Shuttle Stops")).toBeTruthy();
    expect(getByText("Show Building Polygons")).toBeTruthy();
  });

  test("renders setting descriptions", () => {
    const { getByText } = render(<MapSettingsBottomSheet />);

    expect(
      getByText("Toggle the visibility of shuttle stops on the map."),
    ).toBeTruthy();
    expect(
      getByText(
        "Toggle the visibility of Concordia building polygons on the map.",
      ),
    ).toBeTruthy();
  });

  test("calls onClose when bottom sheet is closed", () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = render(
      <MapSettingsBottomSheet onClose={mockOnClose} />,
    );

    const bottomSheet = getByTestId("bottom-sheet");
    fireEvent(bottomSheet, "touchEnd");

    expect(mockOnClose).toHaveBeenCalled();
  });

  test("renders all map settings from the store", () => {
    mockUseMapSettings.mockReturnValue({
      mapSettings: {
        showShuttleStops: true,
        showBuildingPolygons: false,
      },
      updateSetting: mockUpdateSetting,
    });

    const { getAllByRole } = render(<MapSettingsBottomSheet />);

    // Should have 2 switches (one for each setting)
    const switches = getAllByRole("switch");
    expect(switches).toHaveLength(2);
  });
});

describe("SettingListItem", () => {
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders setting with label and description", () => {
    const { getByText } = render(
      <SettingListItem
        settingKey="showShuttleStops"
        value={false}
        onChange={mockOnChange}
      />,
    );

    expect(getByText("Show Shuttle Stops")).toBeTruthy();
    expect(
      getByText("Toggle the visibility of shuttle stops on the map."),
    ).toBeTruthy();
  });

  test("renders switch control for switch type settings", () => {
    const { getByRole } = render(
      <SettingListItem
        settingKey="showShuttleStops"
        value={false}
        onChange={mockOnChange}
      />,
    );

    const switchControl = getByRole("switch");
    expect(switchControl).toBeTruthy();
  });

  test("switch reflects the current value", () => {
    const { getByRole } = render(
      <SettingListItem
        settingKey="showShuttleStops"
        value={true}
        onChange={mockOnChange}
      />,
    );

    const switchControl = getByRole("switch");
    expect(switchControl.props.value).toBe(true);
  });

  test("calls onChange when switch is toggled", () => {
    const { getByRole } = render(
      <SettingListItem
        settingKey="showShuttleStops"
        value={false}
        onChange={mockOnChange}
      />,
    );

    const switchControl = getByRole("switch");
    fireEvent(switchControl, "valueChange", true);

    expect(mockOnChange).toHaveBeenCalledWith(true);
  });

  test("renders nothing for unknown setting key", () => {
    const { toJSON } = render(
      <SettingListItem
        settingKey="unknownSetting"
        value={false}
        onChange={mockOnChange}
      />,
    );

    expect(toJSON()).toBeNull();
  });

  test("handles false value correctly", () => {
    const { getByRole } = render(
      <SettingListItem
        settingKey="showBuildingPolygons"
        value={false}
        onChange={mockOnChange}
      />,
    );

    const switchControl = getByRole("switch");
    expect(switchControl.props.value).toBe(false);
  });
});
