import {
	formatDuration,
	getDistanceDisplayText,
	getSimplifiedAddress,
	parseDirectionsDurationToSeconds,
	stripHtmlTags,
} from "../app/utils/stringUtils";

describe("stringUtils", () => {
	describe("getSimplifiedAddress", () => {
		it("should keep civic number and street name from a full address", () => {
			const address = "1455 De Maisonneuve Blvd W, Montreal, QC, Canada";
			expect(getSimplifiedAddress(address)).toBe("1455 De Maisonneuve Blvd W");
		});
	});

	describe("getDistanceDisplayText", () => {
		it("should format distances under 1000 as meters", () => {
			expect(getDistanceDisplayText(999.4)).toBe("999 m");
		});

		it("should format 1000 meters and above as kilometers", () => {
			expect(getDistanceDisplayText(1000)).toBe("1.0 km");
			expect(getDistanceDisplayText(1549)).toBe("1.5 km");
		});
	});

	describe("stripHtmlTags", () => {
		it("should put each div block on a new line", () => {
			const html = "<div>Head east</div><div>Turn right at the light</div>";
			expect(stripHtmlTags(html)).toBe("Head east\nTurn right at the light");
		});

		it("should keep inline tags as plain text on the same line", () => {
			const html = '<div>Turn <b>left</b> onto <i>Main St</i></div>';
			expect(stripHtmlTags(html)).toBe("Turn left onto Main St");
		});
	});

	describe("formatDuration", () => {
		it("should format hours with remaining minutes", () => {
			expect(formatDuration(6340)).toBe("1 hr 46 min");
		});

		it("should format seconds mode with hour and minute breakdown", () => {
			expect(formatDuration(6340, "seconds")).toBe("1 hr 45 min 40 sec");
		});
	});

	describe("parseDirectionsDurationToSeconds", () => {
		it("should parse minute-only values", () => {
			expect(parseDirectionsDurationToSeconds("2 min")).toBe(120);
		});

		it("should parse mixed hour and minute values", () => {
			expect(parseDirectionsDurationToSeconds("1 hour 5 mins")).toBe(3900);
		});

		it("should parse day, hour, minute and second values", () => {
			expect(parseDirectionsDurationToSeconds("1 day 2 hours 3 min 4 sec")).toBe(93784);
		});
	});
});
