import MissingEventInfoForm from "@/components/schedule/MissingEventInfoForm";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import type { MissingInfoEntry } from "@/components/schedule/MissingEventInfoForm";

const mockMutate = jest.fn();
const mockBack = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockBack }),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useUpdateClassItem: () => ({ mutate: mockMutate, isPending: false }),
  useCourses: () => ({ data: [] }),
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetAllBuildings: () => ({
    isLoading: false,
    data: {
      buildings: {
        SGW: [{ code: "H", name: "Hall", long_name: "Hall Building", address: "1455 De Maisonneuve" }],
        LOY: [],
      },
    },
  }),
}));

const missingLocationEntry: MissingInfoEntry = {
  courseName: "SOEN 202",
  classItem: {
    itemId: "item-1",
    eventId: "event-1",
    type: "lec",
    section: "",
    day: "Tuesday",
    startTime: "11:00",
    endTime: "12:00",
    origin: "google",
  },
};

const missingTimeEntry: MissingInfoEntry = {
  courseName: "SOEN 303",
  classItem: {
    itemId: "item-2",
    eventId: "event-2",
    type: "lab",
    section: "",
    day: "Wednesday",
    startTime: "",
    endTime: "",
    buildingCode: "H",
    room: "110",
    origin: "google",
  },
};

const missingBothEntry: MissingInfoEntry = {
  courseName: "SOEN 404",
  classItem: {
    itemId: "item-3",
    eventId: "event-3",
    type: "tut",
    section: "",
    day: "Thursday",
    startTime: "",
    endTime: "",
    origin: "google",
  },
};

describe("MissingEventInfoForm", () => {
  beforeEach(() => jest.clearAllMocks());

  test("renders empty state when no missing entries", () => {
    const { getByText } = render(
      <MissingEventInfoForm missingEntries={[]} />,
    );
    expect(getByText("All classes are complete!")).toBeTruthy();
  });

  test("renders card with Add Location button for missing location", () => {
    const { getByText, getByTestId } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry]} />,
    );
    expect(getByText("SOEN 202")).toBeTruthy();
    expect(getByText("No Location")).toBeTruthy();
    expect(getByTestId("add-location-SOEN 202-item-1")).toBeTruthy();
  });

  test("renders card with Add Time button for missing time", () => {
    const { getByText, getByTestId } = render(
      <MissingEventInfoForm missingEntries={[missingTimeEntry]} />,
    );
    expect(getByText("SOEN 303")).toBeTruthy();
    expect(getByText("No Time")).toBeTruthy();
    expect(getByTestId("add-time-SOEN 303-item-2")).toBeTruthy();
  });

  test("renders both buttons when location and time are missing", () => {
    const { getByTestId, getByText } = render(
      <MissingEventInfoForm missingEntries={[missingBothEntry]} />,
    );
    expect(getByText("No Location · No Time")).toBeTruthy();
    expect(getByTestId("add-location-SOEN 404-item-3")).toBeTruthy();
    expect(getByTestId("add-time-SOEN 404-item-3")).toBeTruthy();
  });

  test("Continue dismisses card", async () => {
    const { getByTestId, queryByText } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry]} />,
    );
    fireEvent.press(getByTestId("continue-SOEN 202-item-1"));
    await waitFor(() => {
      expect(queryByText("SOEN 202")).toBeNull();
    });
  });

  test("calls onAllResolved when all cards are dismissed", async () => {
    const onAllResolved = jest.fn();
    const { getByTestId } = render(
      <MissingEventInfoForm
        missingEntries={[missingLocationEntry]}
        onAllResolved={onAllResolved}
      />,
    );
    fireEvent.press(getByTestId("continue-SOEN 202-item-1"));
    await waitFor(() => expect(onAllResolved).toHaveBeenCalled());
  });

  test("opens location modal when Add Location is pressed", async () => {
    const { getByTestId, getByText } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry]} />,
    );
    fireEvent.press(getByTestId("add-location-SOEN 202-item-1"));
    await waitFor(() => expect(getByText("Add Location")).toBeTruthy());
  });

  test("opens time modal when Add Time is pressed", async () => {
    const { getByTestId, getByText } = render(
      <MissingEventInfoForm missingEntries={[missingTimeEntry]} />,
    );
    fireEvent.press(getByTestId("add-time-SOEN 303-item-2"));
    await waitFor(() => expect(getByText("Add Time")).toBeTruthy());
  });

  test("shows validation error when saving location with empty room", async () => {
    const { getByTestId, getByText } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry]} />,
    );
    fireEvent.press(getByTestId("add-location-SOEN 202-item-1"));
    await waitFor(() => getByText("Add Location"));
    fireEvent.press(getByText("Save"));
    await waitFor(() => expect(getByText("Please select a building.")).toBeTruthy());
  });

  test("shows validation error when saving time with invalid format", async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <MissingEventInfoForm missingEntries={[missingTimeEntry]} />,
    );
    fireEvent.press(getByTestId("add-time-SOEN 303-item-2"));
    await waitFor(() => getByText("Add Time"));
    fireEvent.changeText(getByPlaceholderText("e.g. 09:00"), "bad");
    fireEvent.press(getByText("Save"));
    await waitFor(() =>
      expect(getByText("Time must be in H:MM or HH:MM format.")).toBeTruthy(),
    );
  });

  test("calls mutate with correct args when saving valid location", async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry]} />,
    );
    fireEvent.press(getByTestId("add-location-SOEN 202-item-1"));
    await waitFor(() => getByText("Add Location"));
    fireEvent.press(getByText("H"));
    fireEvent.changeText(getByPlaceholderText("e.g. 110"), "110");
    fireEvent.press(getByText("Save"));
    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        { classID: "item-1", classItem: { buildingCode: "H", room: "110" } },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
  });

  test("calls mutate with correct args when saving valid time", async () => {
    const { getByTestId, getByText, getByPlaceholderText } = render(
      <MissingEventInfoForm missingEntries={[missingTimeEntry]} />,
    );
    fireEvent.press(getByTestId("add-time-SOEN 303-item-2"));
    await waitFor(() => getByText("Add Time"));
    fireEvent.changeText(getByPlaceholderText("e.g. 09:00"), "09:00");
    fireEvent.changeText(getByPlaceholderText("e.g. 10:30"), "10:30");
    fireEvent.press(getByText("Save"));
    await waitFor(() =>
      expect(mockMutate).toHaveBeenCalledWith(
        { classID: "item-2", classItem: { startTime: "09:00", endTime: "10:30" } },
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      ),
    );
  });

  test("renders multiple cards", () => {
    const { getByText } = render(
      <MissingEventInfoForm missingEntries={[missingLocationEntry, missingTimeEntry, missingBothEntry]} />,
    );
    expect(getByText("SOEN 202")).toBeTruthy();
    expect(getByText("SOEN 303")).toBeTruthy();
    expect(getByText("SOEN 404")).toBeTruthy();
  });

  test("onAllResolved is called after all cards dismissed", async () => {
    const onAllResolved = jest.fn();
    const { getByTestId } = render(
      <MissingEventInfoForm
        missingEntries={[missingLocationEntry, missingTimeEntry]}
        onAllResolved={onAllResolved}
      />,
    );
    fireEvent.press(getByTestId("continue-SOEN 202-item-1"));
    expect(onAllResolved).not.toHaveBeenCalled();
    fireEvent.press(getByTestId("continue-SOEN 303-item-2"));
    await waitFor(() => expect(onAllResolved).toHaveBeenCalled());
  });
});