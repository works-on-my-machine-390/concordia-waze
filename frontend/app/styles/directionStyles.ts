import type { MapPolylineProps } from "react-native-maps";

import { DIRECTION_COLORS } from "@/app/constants";

type DirectionMode = keyof typeof DIRECTION_COLORS;

type DirectionPolylineStyle = Pick<
	MapPolylineProps,
	| "strokeColor"
	| "strokeWidth"
	| "lineDashPattern"
	| "lineCap"
	| "lineJoin"
	| "geodesic"
	| "zIndex"
>;

const basePolylineStyle: Partial<DirectionPolylineStyle> = {
	strokeWidth: 6,
	lineCap: "round",
	lineJoin: "round",
	geodesic: true,
};

export const directionPolylineStyles: Record<DirectionMode, DirectionPolylineStyle> = {
	walking: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.walking,
		lineDashPattern: [10, 6],
        zIndex: 40,
	},
	driving: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.driving,
		zIndex: 35,
	},
	shuttle: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.shuttle,
		zIndex: 30,
	},
	bus: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.bus,
		zIndex: 28,
	},
	stmGreen: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.stmGreen,
		zIndex: 27,
	},
	stmOrange: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.stmOrange,
		zIndex: 27,
	},
	stmBlue: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.stmBlue,
		zIndex: 27,
	},
	stmYellow: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.stmYellow,
		zIndex: 27,
	},
	bicycling: {
		...basePolylineStyle,
		strokeColor: DIRECTION_COLORS.bicycling,
		zIndex: 33,
	},
};