import MissingEventInfoScreen from "@/app/missingEventInfo";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Linking } from "react-native";

jest.mock("@/app/constants", () => ({
  COLORS: {
    maroon: "#6B0F1A",
    background: "#fff",
    textPrimary: "#1A1A2E",
    error: "#D32F2F",
    white: "#fff",
    selectionBlue: "#4A90D9",
  },
}));

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: jest.fn(),
  useUpdateClassItem: () => ({ mutate: jest.fn(), isPending: false }),
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetAllBuildings: () => ({ isLoading: false, data: { buildings: { SGW: [], LOY: [] } } }),
}));

const { useCourses } = require("@/hooks/queries/googleCalendarQueries");

describe("MissingEventInfoScreen", () => {
  beforeEach(() => jest.clearAllMocks());

  test("shows Done button and empty form when no missing entries", () => {
    useCourses.mockReturnValue({ data: [] });
    const { getByText } = render(<MissingEventInfoScreen />);
    expect(getByText("Done")).toBeTruthy();
    expect(getByText("All classes are complete!")).toBeTruthy();
  });

  test("shows Skip All when there are missing entries", () => {
    useCourses.mockReturnValue({
      data: [
        {
          name: "SOEN 202",
          classes: [
            {
              itemId: "item-1",
              type: "lec",
              section: "",
              day: "Tuesday",
              startTime: "11:00",
              endTime: "12:00",
              origin: "google",
            },
          ],
        },
      ],
    });
    const { getByText } = render(<MissingEventInfoScreen />);
    expect(getByText("Skip All")).toBeTruthy();
  });

  test("navigates to schedule when Skip All is pressed", () => {
    useCourses.mockReturnValue({ data: [] });
    const { getByTestId } = render(<MissingEventInfoScreen />);
    fireEvent.press(getByTestId("skip-all-button"));
    expect(mockReplace).toHaveBeenCalledWith("/(drawer)/schedule");
  });

  test("shows extension promo card", () => {
    useCourses.mockReturnValue({ data: [] });
    const { getByText } = render(<MissingEventInfoScreen />);
    expect(getByText("Visual Schedule Builder Export")).toBeTruthy();
    expect(getByText("Get extension →")).toBeTruthy();
  });

  test("opens extension URL when promo is pressed", async () => {
    useCourses.mockReturnValue({ data: [] });
    const openURLSpy = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const { getByTestId } = render(<MissingEventInfoScreen />);
    fireEvent.press(getByTestId("extension-promo-button"));
    await waitFor(() =>
      expect(openURLSpy).toHaveBeenCalledWith(
        "https://chromewebstore.google.com/detail/visual-schedule-builder-e/nbapggbchldhdjckbhdhkhlodokjdoha",
      ),
    );
    openURLSpy.mockRestore();
  });

  test("skips manual origin classes from missing entries", () => {
    useCourses.mockReturnValue({
      data: [
        {
          name: "SOEN 384",
          classes: [
            {
              itemId: "item-manual",
              type: "lec",
              section: "SL",
              day: "Monday",
              startTime: "09:00",
              endTime: "11:00",
              origin: "manual",
            },
          ],
        },
      ],
    });
    const { getByText } = render(<MissingEventInfoScreen />);
    expect(getByText("Done")).toBeTruthy();
    expect(getByText("All classes are complete!")).toBeTruthy();
  });

  test("navigates to schedule via onAllResolved when all cards resolved", async () => {
    useCourses.mockReturnValue({
      data: [
        {
          name: "SOEN 202",
          classes: [
            {
              itemId: "item-1",
              type: "lec",
              section: "",
              day: "Tuesday",
              startTime: "11:00",
              endTime: "12:00",
              origin: "google",
            },
          ],
        },
      ],
    });
    const { getByTestId } = render(<MissingEventInfoScreen />);
    fireEvent.press(getByTestId("continue-SOEN 202-item-1"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(drawer)/schedule"));
  });
});