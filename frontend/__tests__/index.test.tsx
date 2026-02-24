/**
 * Tests for index.tsx (HomeScreen)
 */

import HomeScreen from "@/app/index";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";

// Mock expo-router
const mockPush = jest.fn();
const mockRedirect = jest.fn((props: any) => null);

jest.mock("expo-router", () => ({
  useRouter: jest.fn(() => ({
    push: mockPush,
  })),
  Redirect: (props: any) => {
    mockRedirect(props);
    return null;
  },
}));

// Mock useAuth hook
const mockCheckToken = jest.fn();
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(() => ({
    loggedIn: false,
    checkToken: mockCheckToken,
  })),
}));

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock constants
jest.mock("@/app/constants", () => ({
  COLORS: {
    maroon: "#7f2730",
    gold: "#B8AB85",
    textMuted: "#7a7a7a",
    textPrimary: "#222",
    background: "#FBFAFA",
  },
  APP_INFO: {
    name: "Concordia Waze",
    tagline: "Find your way across campus - indoors & outdoors",
  },
  LOGO_IMAGE: 123, // dummy image reference
}));

// Mock icons
jest.mock("@/app/icons", () => ({
  AccountIcon: ({ testID }: any) => {
    const { Text } = require("react-native");
    return <Text testID={testID || "account-icon"}>AccountIcon</Text>;
  },
  NoAccountIcon: ({ testID }: any) => {
    const { Text } = require("react-native");
    return <Text testID={testID || "no-account-icon"}>NoAccountIcon</Text>;
  },
}));

describe("HomeScreen (index.tsx)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("shows loading indicator while checking authentication", async () => {
    mockCheckToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 100)),
    );

    const { getByTestId } = render(<HomeScreen />);

    // Should show ActivityIndicator while loading
    const indicator = getByTestId("activity-indicator");
    expect(indicator).toBeTruthy();
  });

  test("redirects to /map when user is authenticated", async () => {
    mockCheckToken.mockResolvedValue(true);

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockRedirect).toHaveBeenCalledWith({ href: "/map" });
    });
  });

  test("displays logo, app name, and tagline when not authenticated", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Concordia Waze")).toBeTruthy();
      expect(
        getByText("Find your way across campus - indoors & outdoors"),
      ).toBeTruthy();
    });
  });

  test("shows Sign Up / Log in button when not authenticated", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Sign Up / Log in")).toBeTruthy();
      expect(
        getByText("Save your schedule and favorites for long-term use"),
      ).toBeTruthy();
    });
  });

  test("shows Use without account button when not authenticated", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText("Use without account")).toBeTruthy();
      expect(getByText("Your data stays on this device only")).toBeTruthy();
    });
  });

  test("Sign Up / Log in button navigates to login page with prev param", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      const button = getByTestId("signin-signup-button");
      expect(button).toBeTruthy();
    });

    const button = getByTestId("signin-signup-button");
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { prev: "index" },
    });
  });

  test("Use without account button navigates to map page", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      const button = getByText("Use without account");
      expect(button).toBeTruthy();
    });

    const button = getByText("Use without account");
    fireEvent.press(button);

    expect(mockPush).toHaveBeenCalledWith("/map");
  });

  test("calls checkToken on mount", async () => {
    mockCheckToken.mockResolvedValue(false);

    render(<HomeScreen />);

    await waitFor(() => {
      expect(mockCheckToken).toHaveBeenCalled();
    });
  });

  test("renders icons correctly", async () => {
    mockCheckToken.mockResolvedValue(false);

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId("account-icon")).toBeTruthy();
      expect(getByTestId("no-account-icon")).toBeTruthy();
    });
  });

  test("does not redirect or show content while authentication state is null", () => {
    mockCheckToken.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(false), 100)),
    );

    const { queryByText, getByTestId } = render(<HomeScreen />);

    // Should show loading indicator
    expect(getByTestId("activity-indicator")).toBeTruthy();

    // Should not show content
    expect(queryByText("Concordia Waze")).toBeNull();
    expect(queryByText("Sign Up / Log in")).toBeNull();

    // Should not redirect
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
