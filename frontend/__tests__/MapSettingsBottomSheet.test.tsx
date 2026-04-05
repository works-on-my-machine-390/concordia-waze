import { fireEvent, render } from "@testing-library/react-native";
import MapSettingsBottomSheet from "../components/MapSettingsBottomSheet";

const mockCloseSheet = jest.fn();
const mockUpdateSetting = jest.fn();
const mockSettingListItem = jest.fn();
const mockBottomSheet = jest.fn();

const mapSettingsMock = {
  showShuttleStops: false,
  preferAccessibleRoutes: true,
};

jest.mock("@/hooks/useMapStore", () => ({
  useMapStore: () => ({
    closeSheet: mockCloseSheet,
  }),
}));

jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  default: () => ({
    mapSettings: mapSettingsMock,
    updateSetting: mockUpdateSetting,
  }),
  MapSettings: {
    showShuttleStops: "showShuttleStops",
    preferAccessibleRoutes: "preferAccessibleRoutes",
  },
}));

jest.mock("../components/MapSettingsListItem", () => {
  const { Pressable, Text } = require("react-native");

  return (props: any) => {
    mockSettingListItem(props);
    return (
      <Pressable
        testID={`setting-${props.settingKey}`}
        onPress={() => props.onChange?.(!props.value)}
      >
        <Text>{props.settingKey}</Text>
      </Pressable>
    );
  };
});

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, Pressable, Text } = require("react-native");

  const MockBottomSheet = React.forwardRef((props: any, _ref: any) => {
    mockBottomSheet(props);

    return (
      <View testID="map-settings-bottom-sheet">
        <Pressable testID="bottom-sheet-change" onPress={() => props.onChange?.(1)}>
          <Text>change</Text>
        </Pressable>
        <Pressable
          testID="bottom-sheet-animate"
          onPress={() => props.onAnimate?.(0, 2)}
        >
          <Text>animate</Text>
        </Pressable>
        <Pressable testID="bottom-sheet-close" onPress={() => props.onClose?.()}>
          <Text>close</Text>
        </Pressable>
        {props.children}
      </View>
    );
  });

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

describe("MapSettingsBottomSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders map settings title and list items for each setting", () => {
    const { getByText } = render(<MapSettingsBottomSheet />);

    expect(getByText("Map Settings")).toBeTruthy();
    expect(mockSettingListItem).toHaveBeenCalledTimes(
      Object.keys(mapSettingsMock).length,
    );
  });

  test("passes expected BottomSheet base props", () => {
    render(<MapSettingsBottomSheet />);

    const bottomSheetProps = mockBottomSheet.mock.calls[0][0];
    expect(bottomSheetProps.index).toBe(0);
    expect(bottomSheetProps.snapPoints).toEqual(["20%", "70%"]);
    expect(bottomSheetProps.enablePanDownToClose).toBe(true);
    expect(bottomSheetProps.enableDynamicSizing).toBe(false);
    expect(bottomSheetProps.detached).toBe(true);
  });

  test("invokes onSheetIndexChange from both onChange and onAnimate", () => {
    const onSheetIndexChange = jest.fn();

    const { getByTestId } = render(
      <MapSettingsBottomSheet onSheetIndexChange={onSheetIndexChange} />,
    );

    fireEvent.press(getByTestId("bottom-sheet-change"));
    fireEvent.press(getByTestId("bottom-sheet-animate"));

    expect(onSheetIndexChange).toHaveBeenCalledWith(1);
    expect(onSheetIndexChange).toHaveBeenCalledWith(2);
  });

  test("calls closeSheet when bottom sheet closes", () => {
    const { getByTestId } = render(<MapSettingsBottomSheet />);

    fireEvent.press(getByTestId("bottom-sheet-close"));

    expect(mockCloseSheet).toHaveBeenCalledTimes(1);
  });

  test("updates setting value when a SettingListItem change is triggered", () => {
    const { getByTestId } = render(<MapSettingsBottomSheet />);

    fireEvent.press(getByTestId("setting-showShuttleStops"));

    expect(mockUpdateSetting).toHaveBeenCalledWith("showShuttleStops", true);
  });
});