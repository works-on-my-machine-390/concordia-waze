import Entypo from "@expo/vector-icons/Entypo";
import { fireEvent, render } from "@testing-library/react-native";
import MapSettingsButton from "../components/MapSettingsButton";

jest.mock("@expo/vector-icons/Entypo", () => jest.fn(() => null));

describe("MapSettingsButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("calls onPress when tapped", () => {
    const onPress = jest.fn();
    const { getByLabelText } = render(<MapSettingsButton onPress={onPress} />);

    fireEvent.press(getByLabelText("Open map settings"));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  test("renders icon with expected props", () => {
    render(<MapSettingsButton onPress={jest.fn()} />);

    const iconProps = (Entypo as unknown as jest.Mock).mock.calls[0][0];
    expect(iconProps).toEqual(
      expect.objectContaining({
        name: "dots-three-vertical",
        size: 24,
        color: "#1f2937",
      }),
    );
  });

  test("uses fixed bottom offset regardless of provided bottomPositionPercentage", () => {
    const { toJSON } = render(
      <MapSettingsButton onPress={jest.fn()} bottomPositionPercentage={35} />,
    );

    const tree = toJSON() as { props?: { style?: unknown[] } };
    expect(tree.props?.style).toEqual(
      expect.arrayContaining([expect.objectContaining({ bottom: 160 })]),
    );
  });
});