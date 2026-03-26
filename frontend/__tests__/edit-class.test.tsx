import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import EditClassScreen from "@/app/edit-class";

const backMock = jest.fn();
const invalidateQueriesMock = jest.fn(() => Promise.resolve());

const updateClassItemMock = jest.fn(() => Promise.resolve());
const deleteClassItemMock = jest.fn(() => Promise.resolve());
const updateGuestClassMock = jest.fn(() => Promise.resolve());
const deleteGuestClassMock = jest.fn(() => Promise.resolve());

let mockUserProfile: any = { id: "user-1" };

jest.mock("expo-router", () => ({
  useRouter: () => ({
    back: backMock,
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
    invalidateQueries: invalidateQueriesMock,
  }),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
    updateClassItem: (...args: any[]) => updateClassItemMock.apply(null, args),
    deleteClassItem: (...args: any[]) => deleteClassItemMock.apply(null, args),
  }));
  
  jest.mock("@/hooks/guestStorage", () => ({
    updateGuestClass: (...args: any[]) => updateGuestClassMock.apply(null, args),
    deleteGuestClass: (...args: any[]) => deleteGuestClassMock.apply(null, args),
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
  });

  it("saves logged-in class edits", async () => {
    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(updateClassItemMock).toHaveBeenCalled();
    });

    expect(invalidateQueriesMock).toHaveBeenCalled();
    expect(backMock).toHaveBeenCalled();
  });

  it("saves guest class edits for unauthenticated users", async () => {
    mockUserProfile = null;

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    await waitFor(() => {
      expect(updateGuestClassMock).toHaveBeenCalled();
    });
  });

  it("shows delete dialog and deletes logged-in class", async () => {
    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(deleteClassItemMock).toHaveBeenCalled();
    });

    expect(backMock).toHaveBeenCalled();
  });

  it("deletes guest class for unauthenticated users", async () => {
    mockUserProfile = null;

    const { getByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Delete Class"));
    fireEvent.press(getByText("Delete"));

    await waitFor(() => {
      expect(deleteGuestClassMock).toHaveBeenCalled();
    });
  });

  it("shows error when save fails", async () => {
    updateClassItemMock.mockRejectedValueOnce(new Error("Saving failed"));

    const { getByText, findByText } = render(<EditClassScreen />);

    fireEvent.press(getByText("Confirm & Save"));

    expect(await findByText("Saving failed")).toBeTruthy();
  });
});