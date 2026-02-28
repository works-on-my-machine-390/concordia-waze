import {
	getDistanceDisplayText,
	getSimplifiedAddress,
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
});
