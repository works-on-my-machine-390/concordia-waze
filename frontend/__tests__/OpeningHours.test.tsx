import type { OpeningHoursModel } from "@/hooks/queries/buildingQueries";
import { fireEvent, render } from "@testing-library/react-native";
import OpeningHours from "../components/OpeningHours";

jest.mock("@/app/utils/dateUtils", () => ({
	daysOfWeek: ["monday", "tuesday", "wednesday"],
	getIsOpen247: jest.fn(),
	getOpenStatus: jest.fn(),
	getOpenStatusColor: jest.fn(),
}));

import {
	getIsOpen247,
	getOpenStatus,
	getOpenStatusColor,
} from "@/app/utils/dateUtils";

const mockedGetIsOpen247 = getIsOpen247 as jest.Mock;
const mockedGetOpenStatus = getOpenStatus as jest.Mock;
const mockedGetOpenStatusColor = getOpenStatusColor as jest.Mock;

describe("OpeningHours", () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedGetIsOpen247.mockReturnValue(false);
		mockedGetOpenStatus.mockReturnValue("Open now");
		mockedGetOpenStatusColor.mockReturnValue("green");
	});

	it("renders nothing when openingHours is empty", () => {
		const { queryByText } = render(
			<OpeningHours openingHours={{} as OpeningHoursModel} />,
		);

		expect(queryByText("Open now")).toBeNull();
	});

	it("shows open status and expands/collapses daily list on press", () => {
		const openingHours: OpeningHoursModel = {
			monday: { open: "09:00", close: "17:00" },
			tuesday: { open: "10:00", close: "18:00" },
		};

		const { getByText, getByRole, queryByText } = render(
			<OpeningHours openingHours={openingHours} />,
		);

		expect(getByText("Open now")).toBeTruthy();
		expect(queryByText("Monday:")).toBeNull();

		fireEvent.press(getByRole("button"));

		expect(getByText("Monday:")).toBeTruthy();
		expect(getByText("Tuesday:")).toBeTruthy();
		expect(getByText("09:00 - 17:00")).toBeTruthy();
		expect(getByText("10:00 - 18:00")).toBeTruthy();
		expect(getByText("Wednesday:")).toBeTruthy();
		expect(getByText("Closed")).toBeTruthy();

		fireEvent.press(getByRole("button"));
		expect(queryByText("Monday:")).toBeNull();
	});

	it("shows 'Open 24 hours' for every day when building is open 24/7", () => {
		mockedGetIsOpen247.mockReturnValue(true);

		const openingHours: OpeningHoursModel = {
			monday: { open: "09:00", close: "17:00" },
			tuesday: { open: "08:00", close: "16:00" },
			wednesday: { open: "07:00", close: "15:00" },
		};

		const { getByRole, getAllByText } = render(
			<OpeningHours openingHours={openingHours} />,
		);

		fireEvent.press(getByRole("button"));

		expect(getAllByText("Open 24 hours")).toHaveLength(3);
	});

	it("shows 'Open 24 hours' for a day when open is 00:00 and close is empty", () => {
		const openingHours: OpeningHoursModel = {
			monday: { open: "00:00", close: "" },
			tuesday: { open: "10:00", close: "18:00" },
		};

		const { getByRole, getByText, getAllByText } = render(
			<OpeningHours openingHours={openingHours} />,
		);

		fireEvent.press(getByRole("button"));

		expect(getByText("Monday:")).toBeTruthy();
		expect(getByText("Tuesday:")).toBeTruthy();
		expect(getAllByText("Open 24 hours")).toHaveLength(1);
		expect(getByText("10:00 - 18:00")).toBeTruthy();
	});
});
