import { fireEvent, render } from "@testing-library/react-native";
import { Switch } from "react-native";
import SettingListItem from "../components/MapSettingsListItem";

const mapSettingsListMock = [
  {
    key: "showShuttleStops",
    controlType: "switch",
    label: "Show Shuttle Stops",
    description: "Toggle shuttle stops visibility.",
    defaultValue: false,
  },
];

jest.mock("@/hooks/useMapSettings", () => ({
  MapSettingsList: mapSettingsListMock,
}));

describe("MapSettingsListItem", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders null when setting key is not found", () => {
    const { toJSON } = render(
      <SettingListItem settingKey="unknown-setting" value={true} />,
    );

    expect(toJSON()).toBeNull();
  });

  test("renders setting label, description, and current switch value", () => {
    const { getByText, UNSAFE_getByType } = render(
      <SettingListItem settingKey="showShuttleStops" value={true} />,
    );

    expect(getByText("Show Shuttle Stops")).toBeTruthy();
    expect(getByText("Toggle shuttle stops visibility.")).toBeTruthy();
    expect(UNSAFE_getByType(Switch).props.value).toBe(true);
  });

  test("calls onChange when switch value changes", () => {
    const onChange = jest.fn();

    const { UNSAFE_getByType } = render(
      <SettingListItem
        settingKey="showShuttleStops"
        value={false}
        onChange={onChange}
      />,
    );

    fireEvent(UNSAFE_getByType(Switch), "valueChange", true);

    expect(onChange).toHaveBeenCalledWith(true);
  });
});