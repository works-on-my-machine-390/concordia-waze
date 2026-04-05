import { fireEvent, render } from "@testing-library/react-native";
import ReturnOutdoorButton from "../components/activeNavigation/ReturnOutdoorButton";

const mockPush = jest.fn();
const mockLogoutIcon = jest.fn(() => null);

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../app/icons", () => ({
  LogoutIcon: (props: unknown) => mockLogoutIcon(props),
}));

describe("ReturnOutdoorButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("navigates to map with undefined camera params when location is absent", () => {
    const { getByText } = render(<ReturnOutdoorButton />);

    fireEvent.press(getByText("View outdoor map"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        camLat: undefined,
        camLng: undefined,
      },
    });
  });

  test("navigates to map with camera params from location", () => {
    const { getByText } = render(
      <ReturnOutdoorButton location={{ latitude: 45.497, longitude: -73.579 }} />,
    );

    fireEvent.press(getByText("View outdoor map"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        camLat: 45.497,
        camLng: -73.579,
      },
    });
  });

  test("renders logout icon", () => {
    render(<ReturnOutdoorButton />);

    expect(mockLogoutIcon).toHaveBeenCalledWith(
      expect.objectContaining({ size: 24, color: expect.any(String) }),
    );
  });
});