import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorNavigationBottomSheet from "@/components/indoor/IndoorNavigationBottomSheet";

const mockOnNext = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return ({ children }: any) => <View>{children}</View>;
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ bottom: 0 }),
}));

jest.mock("@/app/utils/indoorNavigationSteps", () => ({
  estimateDurationMinutes: jest.fn(() => 4),
  formatArrivalTimeFromNow: jest.fn(() => "14:32"),
}));

describe("IndoorNavigationBottomSheet", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders metrics and NEXT for non-arrival step", () => {
    const { getByText } = render(
      <IndoorNavigationBottomSheet
        remainingDistanceMeters={42}
        currentStepIndex={0}
        totalSteps={3}
        onNext={mockOnNext}
        isLastStep={false}
        isArrivalStep={false}
      />,
    );

    expect(getByText("14:32")).toBeTruthy();
    expect(getByText("4")).toBeTruthy();
    expect(getByText("42")).toBeTruthy();
    expect(getByText("NEXT")).toBeTruthy();
    expect(getByText("Step 1 of 3")).toBeTruthy();
  });

  it("renders FINISH on arrival step", () => {
    const { getByText, queryByText } = render(
      <IndoorNavigationBottomSheet
        remainingDistanceMeters={0}
        currentStepIndex={2}
        totalSteps={3}
        onNext={mockOnNext}
        isLastStep={true}
        isArrivalStep={true}
      />,
    );

    expect(getByText("FINISH")).toBeTruthy();
    expect(getByText("Step 3 of 3")).toBeTruthy();
    expect(queryByText("arrival")).toBeNull();
  });

  it("calls onNext when NEXT is pressed", () => {
    const { getByText } = render(
      <IndoorNavigationBottomSheet
        remainingDistanceMeters={42}
        currentStepIndex={0}
        totalSteps={3}
        onNext={mockOnNext}
        isLastStep={false}
        isArrivalStep={false}
      />,
    );

    fireEvent.press(getByText("NEXT"));
    expect(mockOnNext).toHaveBeenCalled();
  });

  it("calls onNext when FINISH is pressed", () => {
    const { getByText } = render(
      <IndoorNavigationBottomSheet
        remainingDistanceMeters={0}
        currentStepIndex={2}
        totalSteps={3}
        onNext={mockOnNext}
        isLastStep={true}
        isArrivalStep={true}
      />,
    );

    fireEvent.press(getByText("FINISH"));
    expect(mockOnNext).toHaveBeenCalled();
  });
});