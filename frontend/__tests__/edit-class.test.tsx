import React from "react";
import { Alert } from "react-native";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import EditClassScreen from "../app/edit-class";

const mockBack = jest.fn();
const mockInvalidateQueries = jest.fn(() => Promise.resolve());

const mockUpdateClassItem = jest.fn(() => Promise.resolve());
const mockDeleteClassItem = jest.fn(() => Promise.resolve());
const mockUpdateGuestClass = jest.fn(() => Promise.resolve());
const mockDeleteGuestClass = jest.fn(() => Promise.resolve());

const mockValidateTime = jest.fn(() => null);
const mockValidateTimeRange = jest.fn(() => null);

let mockUserProfile: any = { id: "user-1" };

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: mockBack,
  }),
  useLocalSearchParams: () => ({
    courseName: "SOEN 341",
    classId: "class-1",
    classIndex: "0",
    type: "lec",
    section: "A",
    day: "MON",
    startTime: "09:00",
    endTime: "10:15",
    buildingCode: "H",
    room: "110",
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  updateClassItem: (...args: any[]) => mockUpdateClassItem.apply(null, args),
  deleteClassItem: (...args: any[]) => mockDeleteClassItem.apply(null, args),
}));

jest.mock("@/hooks/guestStorage", () => ({
  updateGuestClass: (...args: any[]) => mockUpdateGuestClass.apply(null, args),
  deleteGuestClass: (...args: any[]) => mockDeleteGuestClass.apply(null, args),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: () => ({
    data: mockUserProfile,
  }),
}));

jest.mock("@/app/utils/classValidationUtils", () => ({
  validateTime: (...args: any[]) => mockValidateTime.apply(null, args),
  validateTimeRange: (...args: any[]) => mockValidateTimeRange.apply(null, args),
}));

describe("EditClassScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile = { id: "user-1" };
    mockValidateTime.mockReturnValue(null);
    mockValidateTimeRange.mockReturnValue(null);
    mockUpdateClassItem.mockResolvedValue(undefined);
    mockDeleteClassItem.mockResolvedValue(undefined);
    mockUpdateGuestClass.mockResolvedValue(undefined);
    mockDeleteGuestClass.mockResolvedValue(undefined);
  });

  it("renders initial values", () => {
    const { getByDisplayValue } = render(<EditClassScreen />);

    expect(getByDisplayValue("A")).toBeTruthy();
    expect(getByDisplayValue("09:00")).toBeTruthy();
    expect(getByDisplayValue("10:15")).toBeTruthy();
    expect(getByDisplayValue("H")).toBeTruthy();
    expect(getByDisplayValue("110")).toBeTruthy();
  });

  it("saves logged-in class edits", async () => {
    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(mockUpdateClassItem).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });

  it("saves guest class edits for unauthenticated users", async () => {
    mockUserProfile = null;

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(mockUpdateGuestClass).toHaveBeenCalled();
    });
  });

  it("shows delete dialog and deletes logged-in class", async () => {
    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteClassItem).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalled();
    });
  });

  it("deletes guest class for unauthenticated users", async () => {
    mockUserProfile = null;

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(mockDeleteGuestClass).toHaveBeenCalled();
    });
  });

  it("shows error when save fails", async () => {
    mockUpdateClassItem.mockRejectedValueOnce(new Error("Saving failed"));

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(await findByText("Saving failed")).toBeTruthy();
  });

  it("shows fallback error when save fails without a message", async () => {
    mockUpdateClassItem.mockRejectedValueOnce({});

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(await findByText("Saving failed. Please try again.")).toBeTruthy();
  });

  it("shows alert when delete fails", async () => {
    mockDeleteClassItem.mockRejectedValueOnce(
      new Error("Could not delete class."),
    );

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
  });

  it("shows fallback alert when delete fails without a message", async () => {
    mockDeleteClassItem.mockRejectedValueOnce({});

    const alertSpy = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith("Error", "Could not delete class.");
    });

    alertSpy.mockRestore();
  });

  it("does not save when validateTime returns an error", async () => {
    mockValidateTime.mockReturnValueOnce("Invalid start time");

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(await findByText("Invalid start time")).toBeTruthy();
    expect(mockUpdateClassItem).not.toHaveBeenCalled();
    expect(mockUpdateGuestClass).not.toHaveBeenCalled();
  });

  it("does not save when validateTimeRange returns an error", async () => {
    mockValidateTimeRange.mockReturnValueOnce(
      "End time must be after start time",
    );

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(
      await findByText("End time must be after start time"),
    ).toBeTruthy();
    expect(mockUpdateClassItem).not.toHaveBeenCalled();
    expect(mockUpdateGuestClass).not.toHaveBeenCalled();
  });

  it("clears the error when editing the start time", async () => {
    mockValidateTime.mockReturnValueOnce("Invalid start time");

    const { getByText, findByText, getByDisplayValue, queryByText } = render(
      <EditClassScreen />,
    );

    fireEvent.press(getByText("Confirm & Save"));
    expect(await findByText("Invalid start time")).toBeTruthy();

    fireEvent.changeText(getByDisplayValue("09:00"), "09:30");

    await waitFor(() => {
      expect(queryByText("Invalid start time")).toBeNull();
    });
  });

  it("clears the error when editing the end time", async () => {
    mockValidateTimeRange.mockReturnValueOnce(
      "End time must be after start time",
    );

    const { getByText, findByText, getByDisplayValue, queryByText } = render(
      <EditClassScreen />,
    );

    fireEvent.press(getByText("Confirm & Save"));
    expect(
      await findByText("End time must be after start time"),
    ).toBeTruthy();

    fireEvent.changeText(getByDisplayValue("10:15"), "10:30");

    await waitFor(() => {
      expect(queryByText("End time must be after start time")).toBeNull();
    });
  });

  it("passes trimmed values to updateClassItem", async () => {
    const { getByText, getByDisplayValue } = render(<EditClassScreen />);

    fireEvent.changeText(getByDisplayValue("A"), "  B  ");
    fireEvent.changeText(getByDisplayValue("09:00"), " 09:30 ");
    fireEvent.changeText(getByDisplayValue("10:15"), " 10:45 ");
    fireEvent.changeText(getByDisplayValue("H"), " H ");
    fireEvent.changeText(getByDisplayValue("110"), " 820 ");

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(mockUpdateClassItem).toHaveBeenCalledWith(
        "SOEN 341",
        "class-1",
        expect.objectContaining({
          section: "  B  ",
          startTime: "09:30",
          endTime: "10:45",
          buildingCode: "H",
          room: "820",
        }),
      );
    });
  });
});