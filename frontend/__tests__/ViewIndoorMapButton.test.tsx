import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import ViewIndoorMapButton from "../components/ViewIndoorMapButton";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

describe("ViewIndoorMapButton", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
  });

  test("renders button with correct text", () => {
    const { getByText } = renderWithProviders(
      <ViewIndoorMapButton buildingCode="H" />,
    );

    expect(getByText("View indoor map")).toBeTruthy();
  });

  test("navigates to indoor map with building code when pressed", () => {
    const { getByText } = renderWithProviders(
      <ViewIndoorMapButton buildingCode="H" />,
    );

    fireEvent.press(getByText("View indoor map"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "H" },
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  test("navigates with different building codes", () => {
    const { rerender, getByText } = renderWithProviders(
      <ViewIndoorMapButton buildingCode="CC" />,
    );

    fireEvent.press(getByText("View indoor map"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "CC" },
    });

    mockPush.mockClear();

    rerender(<ViewIndoorMapButton buildingCode="VL" />);

    fireEvent.press(getByText("View indoor map"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "VL" },
    });
  });

  test("calls router.push only when button is pressed", () => {
    renderWithProviders(<ViewIndoorMapButton buildingCode="MB" />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  test("handles multiple presses", () => {
    const { getByText } = renderWithProviders(
      <ViewIndoorMapButton buildingCode="LB" />,
    );

    const button = getByText("View indoor map");

    fireEvent.press(button);
    fireEvent.press(button);
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledTimes(3);
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: { buildingCode: "LB" },
    });
  });
});
