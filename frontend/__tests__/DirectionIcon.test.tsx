import React from "react";
import { render } from "@testing-library/react-native";
import DirectionIcon from "@/components/DirectionIcon";

jest.mock("@expo/vector-icons/MaterialIcons", () => {
	const { Text } = require("react-native");
	return ({ name, size, color }: { name: string; size?: number; color?: string }) => (
		<Text testID="material-icons" name={name} size={size} color={color}>
			{name}
		</Text>
	);
});

jest.mock("@expo/vector-icons/MaterialCommunityIcons", () => {
	const { Text } = require("react-native");
	return ({ name, size, color }: { name: string; size?: number; color?: string }) => (
		<Text testID="material-community-icons" name={name} size={size} color={color}>
			{name}
		</Text>
	);
});

describe("DirectionIcon", () => {
	const sharedProps = {
		size: 24,
		color: "#123456",
	};

	test.each([
		"turn-left",
		"turn-right",
		"turn-slight-left",
		"turn-slight-right",
		"turn-sharp-left",
		"turn-sharp-right",
		"fork-left",
		"fork-right",
		"ramp-left",
		"ramp-right",
		"roundabout-left",
		"roundabout-right",
		"straight",
	])(
		"renders MaterialIcons with matching name for %s",
		(maneuver) => {
			const { getByTestId, queryByTestId } = render(
				<DirectionIcon maneuver={maneuver} {...sharedProps} />,
			);

			const icon = getByTestId("material-icons");
			expect(icon.props.name).toBe(maneuver);
			expect(icon.props.size).toBe(sharedProps.size);
			expect(icon.props.color).toBe(sharedProps.color);
			expect(queryByTestId("material-community-icons")).toBeNull();
		},
	);

	test("renders merge maneuver with MaterialCommunityIcons", () => {
		const { getByTestId, queryByTestId } = render(
			<DirectionIcon maneuver="merge" {...sharedProps} />,
		);

		const icon = getByTestId("material-community-icons");
		expect(icon.props.name).toBe("call-merge");
		expect(icon.props.size).toBe(sharedProps.size);
		expect(icon.props.color).toBe(sharedProps.color);
		expect(queryByTestId("material-icons")).toBeNull();
	});

	test("maps uturn-left maneuver to u-turn-left icon", () => {
		const { getByTestId } = render(
			<DirectionIcon maneuver="uturn-left" {...sharedProps} />,
		);

		const icon = getByTestId("material-icons");
		expect(icon.props.name).toBe("u-turn-left");
	});

	test("maps uturn-right maneuver to u-turn-right icon", () => {
		const { getByTestId } = render(
			<DirectionIcon maneuver="uturn-right" {...sharedProps} />,
		);

		const icon = getByTestId("material-icons");
		expect(icon.props.name).toBe("u-turn-right");
	});

	test("falls back to straight icon for unknown maneuver", () => {
		const { getByTestId, queryByTestId } = render(
			<DirectionIcon maneuver="unknown-maneuver" {...sharedProps} />,
		);

		const icon = getByTestId("material-icons");
		expect(icon.props.name).toBe("straight");
		expect(icon.props.size).toBe(sharedProps.size);
		expect(icon.props.color).toBe(sharedProps.color);
		expect(queryByTestId("material-community-icons")).toBeNull();
	});
});
