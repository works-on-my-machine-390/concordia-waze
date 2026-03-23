import {
	OutdoorDirectionsModel,
	StepModel,
	TransitMode,
	TransitType,
} from "@/hooks/queries/navigationQueries";
import { useNavigationStore } from "@/hooks/useNavigationStore";
import { render } from "@testing-library/react-native";
import React from "react";
import OutdoorNavigationTransitSteps from "../components/OutdoorNavigationTransitSteps";

const mockTransitTypeIcon = jest.fn();
const mockWalkingDottedLine = jest.fn();

jest.mock("@/app/icons", () => {
	const { Text } = require("react-native");
	return {
		CircleIcon: ({ size }: { size: number }) => (
			<Text testID="circle-icon">Circle-{size}</Text>
		),
	};
});

jest.mock("../components/TransitTypeIcon", () => {
	return function MockTransitTypeIcon(props: {
		transitType: TransitType;
		size: number;
	}) {
		const { Text } = require("react-native");
		mockTransitTypeIcon(props);
		return <Text testID="transit-type-icon">{props.transitType}</Text>;
	};
});

jest.mock("../components/WalkingDottedLine", () => {
	return function MockWalkingDottedLine(props: { height: number }) {
		const { Text } = require("react-native");
		mockWalkingDottedLine(props);
		return <Text testID="walking-dotted-line">Height-{props.height}</Text>;
	};
});

describe("OutdoorNavigationTransitSteps", () => {
	const createStep = (overrides?: Partial<StepModel>): StepModel => ({
		instruction: "Walk to next stop",
		distance: "0.4 km",
		duration: "4 min",
		start: { latitude: 45.49, longitude: -73.57 },
		end: { latitude: 45.5, longitude: -73.58 },
		polyline: "step-polyline",
		...overrides,
	});

	const createDirections = (
		overrides?: Partial<OutdoorDirectionsModel>,
	): OutdoorDirectionsModel => ({
		mode: TransitMode.transit,
		duration: "18 min",
		distance: "2.6 km",
		departure_message: "Depart now",
		polyline: "route-polyline",
		steps: [
			createStep({
				travel_mode: TransitMode.transit,
				departure_stop: "Guy-Concordia",
				arrival_stop: "Atwater",
				departure_time: "10:15 AM",
				transit_line: "Green",
				transit_headsign: "Angrignon",
				num_stops: 2,
				transit_type: TransitType.SUBWAY,
			}),
		],
		...overrides,
	});

	beforeEach(() => {
		jest.clearAllMocks();
		useNavigationStore.setState({
			startLocation: undefined,
			endLocation: undefined,
		});
	});

	it("renders fallback start and destination labels when locations are missing", () => {
		const directions = createDirections({
			steps: [
				createStep({
					travel_mode: TransitMode.walking,
					instruction: "Walk to bus stop",
					distance: "0.3 km",
					duration: "3 min",
					polyline: "walk-polyline-1",
				}),
			],
		});

		const { getByText, getByTestId } = render(
			<OutdoorNavigationTransitSteps directions={directions} />,
		);

		expect(getByText("Start location")).toBeTruthy();
		expect(getByText("Destination")).toBeTruthy();
		expect(getByText("Walk to bus stop")).toBeTruthy();
		expect(getByText("3 min (0.3 km)")).toBeTruthy();
		expect(getByTestId("walking-dotted-line")).toBeTruthy();
		expect(mockWalkingDottedLine).toHaveBeenCalledWith(
			expect.objectContaining({ height: 120 }),
		);
	});

	it("renders transit step details and uses store location names", () => {
		useNavigationStore.setState({
			startLocation: {
				name: "H - Hall Building",
				latitude: 45.497,
				longitude: -73.579,
				code: "H",
			},
			endLocation: {
				name: "Loyola Campus",
				latitude: 45.458,
				longitude: -73.64,
				code: "LOY",
			},
		});

		const directions = createDirections({
			steps: [
				createStep({
					travel_mode: TransitMode.transit,
					departure_stop: "Guy-Concordia",
					arrival_stop: "Atwater",
					departure_time: "10:15 AM",
					transit_line: "Green",
					transit_headsign: "Angrignon",
					num_stops: 2,
					duration: "5 min",
					transit_type: TransitType.SUBWAY,
					polyline: "transit-polyline-1",
				}),
			],
		});

		const { getByText } = render(
			<OutdoorNavigationTransitSteps directions={directions} />,
		);

		expect(getByText("H - Hall Building")).toBeTruthy();
		expect(getByText("Loyola Campus")).toBeTruthy();
		expect(getByText("Guy-Concordia")).toBeTruthy();
		expect(getByText("Atwater")).toBeTruthy();
		expect(getByText("Green")).toBeTruthy();
		expect(getByText("Angrignon")).toBeTruthy();
		expect(getByText("5 min (2 stops)")).toBeTruthy();
		expect(getByText("Departs at 10:15 AM")).toBeTruthy();
		expect(mockTransitTypeIcon).toHaveBeenCalledWith(
			expect.objectContaining({
				transitType: TransitType.SUBWAY,
				size: 20,
			}),
		);
	});

	it("renders mixed transit and walking steps with corresponding transit type icons", () => {
		const directions = createDirections({
			steps: [
				createStep({
					travel_mode: TransitMode.transit,
					transit_type: TransitType.BUS,
					transit_line: "105",
					transit_headsign: "Downtown",
					departure_stop: "Sherbrooke / Guy",
					arrival_stop: "Atwater / Ste-Catherine",
					departure_time: "9:00 AM",
					num_stops: 3,
					duration: "8 min",
					polyline: "transit-polyline-2",
				}),
				createStep({
					travel_mode: TransitMode.walking,
					instruction: "Walk to destination",
					duration: "6 min",
					distance: "0.5 km",
					polyline: "walk-polyline-2",
				}),
			],
		});

		const { getByText } = render(
			<OutdoorNavigationTransitSteps directions={directions} />,
		);

		expect(getByText("105")).toBeTruthy();
		expect(getByText("Downtown")).toBeTruthy();
		expect(getByText("Walk to destination")).toBeTruthy();
		expect(mockTransitTypeIcon).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({ transitType: TransitType.BUS, size: 20 }),
		);
		expect(mockTransitTypeIcon).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({ transitType: TransitType.WALKING, size: 20 }),
		);
	});
});
