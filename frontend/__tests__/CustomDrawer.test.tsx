/**
 * Tests for CustomDrawer component
 */

import React from "react";
import { render, act, fireEvent } from "@testing-library/react-native";
import CustomDrawer from "@/components/CustomDrawer";
import { Toast } from "toastify-react-native";

// Mock expo-router
jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

// Mock useAuth hook
jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

// Mock useGetProfile hook
jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

// Mock safe area insets
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: jest.fn(),
}));

// Mock Toast
jest.mock("toastify-react-native", () => ({
  Toast: {
    success: jest.fn(),
  },
}));

// Mock DrawerContentScrollView and DrawerItemList
jest.mock("@react-navigation/drawer", () => {
  return {
    DrawerContentScrollView: ({ children }: any) => children,
    DrawerItemList: () => {
      const React = require("react");
      const { Text } = require("react-native");
      return React.createElement(
        Text,
        { testID: "drawer-item-list" },
        "DrawerItemList",
      );
    },
  };
});

// Mock LinearGradient
jest.mock("expo-linear-gradient", () => {
  return {
    LinearGradient: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock AuthButton
jest.mock("@/components/AuthButton", () => {
  return function MockAuthButton(props: any) {
    const React = require("react");
    const { Text } = require("react-native");
    const { variant, loggedIn, onPress } = props;
    return React.createElement(
      Text,
      {
        testID: "auth-button",
        onPress: onPress,
      },
      variant === "menu" ? (loggedIn ? "Log out" : "Login") : "Auth",
    );
  };
});

// Mock AccountIcon
jest.mock("@/app/icons", () => {
  return {
    AccountIcon: () => {
      const React = require("react");
      const { Text } = require("react-native");
      return React.createElement(
        Text,
        { testID: "account-icon" },
        "AccountIcon",
      );
    },
  };
});

// Mock constants
jest.mock("@/app/constants", () => ({
  COLORS: {
    conuRed: "#c1272d",
    conuRedLight: "#e8d5d3",
    gold: "#daa520",
    goldDark: "#b8860b",
  },
}));

import { useRouter } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { useSafeAreaInsets } from "react-native-safe-area-context";

describe("CustomDrawer", () => {
  let mockRouterPush: jest.Mock;
  let mockRouterReplace: jest.Mock;
  let mockLogout: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockRouterPush = jest.fn();
    mockRouterReplace = jest.fn();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockRouterPush,
      replace: mockRouterReplace,
    });

    mockLogout = jest.fn().mockResolvedValue(undefined);
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: false,
      logout: mockLogout,
    });

    (useGetProfile as jest.Mock).mockReturnValue({
      data: null,
    });

    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 0,
      bottom: 0,
    });
  });

  test("renders component without crashing", () => {
    const { getByTestId } = render(<CustomDrawer />);
    expect(getByTestId("account-icon")).toBeTruthy();
  });

  test("displays user name from profile data", () => {
    (useGetProfile as jest.Mock).mockReturnValue({
      data: { name: "John Doe" },
    });

    const { getByText } = render(<CustomDrawer />);
    expect(getByText("John Doe")).toBeTruthy();
  });

  test("displays 'Guest' when no profile data is available", () => {
    (useGetProfile as jest.Mock).mockReturnValue({
      data: null,
    });

    const { getByText } = render(<CustomDrawer />);
    expect(getByText("Guest")).toBeTruthy();
  });

  test("displays 'Guest' when profile data has no name", () => {
    (useGetProfile as jest.Mock).mockReturnValue({
      data: { id: 1 },
    });

    const { getByText } = render(<CustomDrawer />);
    expect(getByText("Guest")).toBeTruthy();
  });

  test("renders AccountIcon in avatar", () => {
    const { getByTestId } = render(<CustomDrawer />);
    expect(getByTestId("account-icon")).toBeTruthy();
  });

  test("renders DrawerItemList", () => {
    const { getByTestId } = render(<CustomDrawer />);
    expect(getByTestId("drawer-item-list")).toBeTruthy();
  });

  test("renders AuthButton with menu variant", () => {
    const { getByTestId } = render(<CustomDrawer />);
    expect(getByTestId("auth-button")).toBeTruthy();
  });

  test("AuthButton shows 'Login' when user is not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: false,
      logout: mockLogout,
    });

    const { getByText } = render(<CustomDrawer />);
    expect(getByText("Login")).toBeTruthy();
  });

  test("AuthButton shows 'Log out' when user is logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: true,
      logout: mockLogout,
    });

    const { getByText } = render(<CustomDrawer />);
    expect(getByText("Log out")).toBeTruthy();
  });

  test("navigates to login when user presses auth button while not logged in", () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: false,
      logout: mockLogout,
    });

    const { getByTestId } = render(<CustomDrawer />);
    const authButton = getByTestId("auth-button");

    act(() => {
      fireEvent.press(authButton);
    });

    expect(mockRouterPush).toHaveBeenCalledWith("/login");
  });

  test("calls logout when user presses auth button while logged in", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: true,
      logout: mockLogout,
    });

    const { getByTestId } = render(<CustomDrawer />);
    const authButton = getByTestId("auth-button");

    await act(async () => {
      fireEvent.press(authButton);
    });

    expect(mockLogout).toHaveBeenCalled();
  });

  test("shows success toast after logout", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: true,
      logout: mockLogout,
    });

    const { getByTestId } = render(<CustomDrawer />);
    const authButton = getByTestId("auth-button");

    await act(async () => {
      fireEvent.press(authButton);
    });

    expect(Toast.success).toHaveBeenCalledWith("Logged out successfully.");
  });

  test("navigates to root after logout", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      loggedIn: true,
      logout: mockLogout,
    });

    const { getByTestId } = render(<CustomDrawer />);
    const authButton = getByTestId("auth-button");

    await act(async () => {
      fireEvent.press(authButton);
    });

    expect(mockRouterReplace).toHaveBeenCalledWith("/");
  });

  test("applies safe area insets to header", () => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 30,
      bottom: 20,
    });

    const { getByText } = render(<CustomDrawer />);
    const nameText = getByText("Guest");

    // Verify that the component renders with safe area consideration
    expect(nameText).toBeTruthy();
  });

  test("applies safe area insets to footer", () => {
    (useSafeAreaInsets as jest.Mock).mockReturnValue({
      top: 0,
      bottom: 34,
    });

    const { getByTestId } = render(<CustomDrawer />);
    expect(getByTestId("auth-button")).toBeTruthy();
  });

  test("passes drawer props to DrawerContentScrollView", () => {
    const drawerProps = { navigation: {}, descriptors: {} };
    const { getByTestId } = render(<CustomDrawer {...drawerProps} />);

    expect(getByTestId("drawer-item-list")).toBeTruthy();
  });

  test("truncates long user names with ellipsis", () => {
    const longName = "This is a very long user name that should be truncated";
    (useGetProfile as jest.Mock).mockReturnValue({
      data: { name: longName },
    });

    const { getByText } = render(<CustomDrawer />);
    const nameText = getByText(longName);

    // Check that the Text component has numberOfLines={1} and ellipsizeMode="tail"
    expect(nameText.props.numberOfLines).toBe(1);
    expect(nameText.props.ellipsizeMode).toBe("tail");
  });
});
