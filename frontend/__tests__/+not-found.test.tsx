/**
 * Tests for NotFound component
 */

import NotFound from "@/app/+not-found";
import { fireEvent, render } from "@testing-library/react-native";
import { Image } from "react-native";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  router: {
    push: (...args: any[]) => mockPush(...args),
  },
  useRouter: () => ({
    push: (...args: any[]) => mockPush(...args),
  }),
}));

describe("NotFound", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("navigates to home page when button is pressed", () => {
    const { getByText } = render(<NotFound />);
    const button = getByText("Go Home");
    fireEvent.press(button);
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/");
  });

  test("renders all required elements together", () => {
    const { getByText, UNSAFE_root } = render(<NotFound />);

    // Check all elements are present
    expect(UNSAFE_root.findByType(Image)).toBeTruthy();
    expect(getByText("404")).toBeTruthy();
    expect(getByText("Page Not Found")).toBeTruthy();
    expect(
      getByText("The page you're looking for doesn't exist."),
    ).toBeTruthy();
    expect(getByText("how did you get lost with a campus guide?")).toBeTruthy();
    expect(getByText("Go Home")).toBeTruthy();
  });
});
