import React from "react";
import { render } from "@testing-library/react-native";
import IndoorNavigationInstructionCard from "@/components/indoor/IndoorNavigationInstructionCard";

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("IndoorNavigationInstructionCard", () => {
  it("returns null when step is null", () => {
    const { queryByText } = render(
      <IndoorNavigationInstructionCard step={null} topOffset={40} />,
    );

    expect(queryByText("You have arrived")).toBeNull();
  });

  it("shows distance and instruction for non-arrival step", () => {
    const step = {
      id: "1",
      floorNumber: 1,
      targetPoint: { x: 0.1, y: 0.2 },
      kind: "turn" as const,
      iconName: "arrow-undo" as const,
      instruction: "Turn left at next intersection",
      distanceMeters: 12.4,
      remainingDistanceMeters: 30,
    };

    const { getByText } = render(
      <IndoorNavigationInstructionCard step={step} topOffset={40} />,
    );

    expect(getByText("12 m")).toBeTruthy();
    expect(getByText("Turn left at next intersection")).toBeTruthy();
  });

  it("does not show distance for arrival step", () => {
    const step = {
      id: "2",
      floorNumber: 1,
      targetPoint: { x: 0.5, y: 0.5 },
      kind: "arrival" as const,
      iconName: "location" as const,
      instruction: "You have arrived",
      distanceMeters: 0,
      remainingDistanceMeters: 0,
    };

    const { getByText, queryByText } = render(
      <IndoorNavigationInstructionCard step={step} topOffset={40} />,
    );

    expect(getByText("You have arrived")).toBeTruthy();
    expect(queryByText("1 m")).toBeNull();
  });

  it("rounds minimum displayed distance to 1 m", () => {
    const step = {
      id: "3",
      floorNumber: 1,
      targetPoint: { x: 0.1, y: 0.2 },
      kind: "walk" as const,
      iconName: "walk" as const,
      instruction: "Head straight",
      distanceMeters: 0.1,
      remainingDistanceMeters: 3,
    };

    const { getByText } = render(
      <IndoorNavigationInstructionCard step={step} topOffset={40} />,
    );

    expect(getByText("1 m")).toBeTruthy();
  });
});