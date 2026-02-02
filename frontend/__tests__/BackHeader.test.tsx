/**
 * Tests for BackHeader component
 */

import BackHeader from "@/components/BackHeader";
import { fireEvent, render } from "@testing-library/react-native";
import { useLocalSearchParams } from "expo-router";

// Mock router
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    back: mockBack,
  })),
  useLocalSearchParams: jest.fn(),
}));

describe("BackHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows default title 'Home Page' if no prev param and no title prop", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({});
    const { getByText } = render(<BackHeader />);
    getByText("Home Page");
  });

  test("shows 'Log In' when prev param is 'login'", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ prev: "login" });
    const { getByText } = render(<BackHeader />);
    getByText("Log In");
  });

  test("shows 'Sign Up' when prev param is 'register'", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ prev: "register" });
    const { getByText } = render(<BackHeader />);
    getByText("Sign Up");
  });

  test("shows 'Home Page' when prev param is 'index'", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ prev: "index" });
    const { getByText } = render(<BackHeader />);
    getByText("Home Page");
  });

  test("uses custom title prop if provided", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ prev: "login" });
    const { getByText } = render(<BackHeader title="Custom Title" />);
    getByText("Custom Title");
  });

  test("pressing header triggers router.back()", () => {
    (useLocalSearchParams as jest.Mock).mockReturnValue({ prev: "login" });
    const { getByText } = render(<BackHeader />);
    const title = getByText("Log In");

    fireEvent.press(title);
    expect(mockBack).toHaveBeenCalled();
  });
});
