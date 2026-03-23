import { NavigationHeader } from "@/components/NavigationHeader";
import { useNavigationStore } from "../hooks/useNavigationStore";
import { fireEvent, render } from "@testing-library/react-native";

jest.mock("../app/icons", () => ({
  CircleIcon: "CircleIcon",
  LocationIcon: "LocationIcon",
}));

function resetNavigationStore() {
  useNavigationStore.setState({
    startLocation: undefined,
    endLocation: undefined,
  });
}

describe("NavigationHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetNavigationStore();
  });

  test("renders fallback labels when no locations are set", () => {
    const { getByText } = render(<NavigationHeader />);

    expect(getByText("From")).toBeTruthy();
    expect(getByText("To")).toBeTruthy();
    expect(getByText("Select start")).toBeTruthy();
    expect(getByText("Select destination")).toBeTruthy();
  });

  test("renders start and end names from navigation store", () => {
    useNavigationStore.setState({
      startLocation: {
        name: "H - Hall Building",
        latitude: 45.497,
        longitude: -73.579,
        code: "H",
      },
      endLocation: {
        name: "EV - Engineering Building",
        latitude: 45.495,
        longitude: -73.577,
        code: "EV",
      },
    });

    const { getByText } = render(<NavigationHeader />);

    expect(getByText("H - Hall Building")).toBeTruthy();
    expect(getByText("EV - Engineering Building")).toBeTruthy();
  });

  test("handles long and special-character names", () => {
    const longLocation = `${"A".repeat(80)} Café René-Lévesque`;

    useNavigationStore.setState({
      startLocation: {
        name: longLocation,
        latitude: 45.497,
        longitude: -73.579,
        code: "LONG",
      },
      endLocation: undefined,
    });

    const { getByText } = render(<NavigationHeader />);

    expect(getByText(longLocation)).toBeTruthy();
  });

  test("calls edit handlers when rows are pressed", () => {
    const onStartLocationPress = jest.fn();
    const onEndLocationPress = jest.fn();

    const { getByText } = render(
      <NavigationHeader
        onStartLocationPress={onStartLocationPress}
        onEndLocationPress={onEndLocationPress}
      />,
    );

    fireEvent.press(getByText("From"));
    fireEvent.press(getByText("To"));

    expect(onStartLocationPress).toHaveBeenCalledTimes(1);
    expect(onEndLocationPress).toHaveBeenCalledTimes(1);
  });
});
