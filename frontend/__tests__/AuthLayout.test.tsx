/**
 * Tests for AuthLayout component
 */

import React from "react";
import { Image, Text } from "react-native";
import { render } from "@testing-library/react-native";
import AuthLayout from "@/components/AuthLayout";

// Mock BackHeader
jest.mock("@/components/BackHeader", () => {
  return function MockBackHeader() {
    const { Text } = require("react-native");
    return <Text testID="back-header">BackHeader</Text>;
  };
});

// Mock SafeAreaView
jest.mock("react-native-safe-area-context", () => {
  return {
    SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock logo image and colors
jest.mock("@/app/constants", () => ({
  COLORS: {
    background: "#fff",
  },
  LOGO_IMAGE: 123, // dummy image reference
}));

describe("AuthLayout", () => {
  test("Provided title renders correctly", () => {
    const title = "Welcome back!";

    const { getByText } = render(
      <AuthLayout title={title}>
        <Text>Child content</Text>
      </AuthLayout>,
    );

    getByText(title);
  });

  test("Children render correctly", () => {
    const { getByText } = render(
      <AuthLayout title="Test title">
        <Text>Form goes here</Text>
      </AuthLayout>,
    );

    getByText("Form goes here");
  });

  test("BackHeader is rendered", () => {
    const { getByTestId } = render(
      <AuthLayout title="Test title">
        <Text>Child</Text>
      </AuthLayout>,
    );

    expect(getByTestId("back-header")).toBeTruthy();
  });

  test("Logo image is rendered", () => {
    const { UNSAFE_getByType } = render(
      <AuthLayout title="Test title">
        <Text>Child</Text>
      </AuthLayout>,
    );

    const image = UNSAFE_getByType(Image);
    expect(image).toBeTruthy();
  });

  test("Default logo size is applied when logoSize is not provided", () => {
    const { UNSAFE_getByType } = render(
      <AuthLayout title="Test title">
        <Text>Child</Text>
      </AuthLayout>,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.style.width).toBe(140);
    expect(image.props.style.height).toBe(140);
  });

  test("Custom logoSize is applied when provided", () => {
    const { UNSAFE_getByType } = render(
      <AuthLayout title="Test title" logoSize={200}>
        <Text>Child</Text>
      </AuthLayout>,
    );

    const image = UNSAFE_getByType(Image);
    expect(image.props.style.width).toBe(200);
    expect(image.props.style.height).toBe(200);
  });
});
