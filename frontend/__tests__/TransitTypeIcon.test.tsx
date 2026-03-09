import { COLORS } from "@/app/constants";
import TransitTypeIcon from "@/components/TransitTypeIcon";
import { TransitType } from "@/hooks/queries/navigationQueries";
import { render } from "@testing-library/react-native";
import React from "react";

jest.mock("@expo/vector-icons/MaterialIcons", () => {
  const { Text } = require("react-native");
  return ({ name, size, color }: { name: string; size?: number; color?: string }) => (
    <Text testID="material-icons" name={name} size={size} color={color}>
      {name}
    </Text>
  );
});

describe("TransitTypeIcon", () => {
  test.each([
    [TransitType.BUS, "directions-bus"],
    [TransitType.SUBWAY, "subway"],
    [TransitType.TRAIN, "directions-train"],
    [TransitType.TRAM, "tram"],
    [TransitType.WALKING, "directions-walk"],
  ])("maps %s to %s", (transitType, expectedIconName) => {
    const { getByTestId } = render(
      <TransitTypeIcon transitType={transitType as TransitType} size={20} />,
    );

    const icon = getByTestId("material-icons");
    expect(icon.props.name).toBe(expectedIconName);
    expect(icon.props.size).toBe(20);
    expect(icon.props.color).toBe(COLORS.textPrimary);
  });

  test("uses custom color when provided", () => {
    const { getByTestId } = render(
      <TransitTypeIcon
        transitType={TransitType.BUS}
        size={16}
        color="#ff00aa"
      />,
    );

    const icon = getByTestId("material-icons");
    expect(icon.props.name).toBe("directions-bus");
    expect(icon.props.color).toBe("#ff00aa");
  });

  test("falls back to directions-transit for unknown transit type", () => {
    const { getByTestId } = render(
      <TransitTypeIcon transitType={"UNKNOWN" as TransitType} />,
    );

    const icon = getByTestId("material-icons");
    expect(icon.props.name).toBe("directions-transit");
    expect(icon.props.size).toBeUndefined();
    expect(icon.props.color).toBe(COLORS.textPrimary);
  });
});
