import React from "react";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import EditClassScreen from "../app/edit-class";

const mockBack = jest.fn();
const mockInvalidateQueries = jest.fn(() => Promise.resolve());

const mockUpdateClassItem = jest.fn(() => Promise.resolve());
const mockDeleteClassItem = jest.fn(() => Promise.resolve());
const mockUpdateGuestClass = jest.fn(() => Promise.resolve());
const mockDeleteGuestClass = jest.fn(() => Promise.resolve());

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
  validateTime: jest.fn(() => null),
  validateTimeRange: jest.fn(() => null),
}));

describe("EditClassScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUserProfile = { id: "user-1" };
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
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it("saves guest class edits for unauthenticated users", async () => {
    mockUserProfile = null;

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(mockUpdateGuestClass).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
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
      expect(mockBack).toHaveBeenCalled();
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

    await waitFor(() => {
      expect(mockBack).toHaveBeenCalled();
    });
  });

  it("shows error when save fails", async () => {
    mockUpdateClassItem.mockRejectedValueOnce(new Error("Saving failed"));

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(await findByText("Saving failed")).toBeTruthy();
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
});