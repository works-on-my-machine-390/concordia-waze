import RecenterButton from "@/components/activeNavigation/RecenterButton";
import { useMapStore } from "@/hooks/useMapStore";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { render } from "@testing-library/react-native";

jest.mock("@expo/vector-icons/build/MaterialCommunityIcons", () => {
  const { View } = require("react-native");
  return function MockMaterialCommunityIcons() {
    return <View testID="navigation-icon" />;
  };
});

describe("RecenterButton", () => {
  beforeEach(() => {
    useMapStore.setState({
      userLocation: undefined,
    });

    useNavigationStore.setState({
      followingGPS: false,
    });
  });

  test("does not render when user location is unavailable", () => {
    const { queryByText } = render(<RecenterButton />);

    expect(queryByText("Recenter")).toBeNull();
  });

  test("renders when user location exists and GPS following is off", () => {
    useMapStore.setState({
      userLocation: {
        coords: {
          latitude: 45.497,
          longitude: -73.579,
        },
      } as any,
    });

    const { getByText } = render(<RecenterButton />);

    expect(getByText("Recenter")).toBeTruthy();
  });

  test("does not render while following GPS", () => {
    useMapStore.setState({
      userLocation: {
        coords: {
          latitude: 45.497,
          longitude: -73.579,
        },
      } as any,
    });

    useNavigationStore.setState({
      followingGPS: true,
    });

    const { queryByText } = render(<RecenterButton />);

    expect(queryByText("Recenter")).toBeNull();
  });
});
