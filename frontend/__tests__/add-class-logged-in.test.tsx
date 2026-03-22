import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import AddClassScreen from "@/app/add-class";
import { router } from "expo-router";

import { useGetProfile } from "@/hooks/queries/userQueries";
import {
  addCourse,
  addClassItem,
} from "@/hooks/queries/googleCalendarQueries";
import { addGuestCourse, getGuestCourses } from "@/hooks/guestStorage";
import { useQueryClient } from "@tanstack/react-query";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
  },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  addCourse: jest.fn(),
  addClassItem: jest.fn(),
}));

jest.mock("@/hooks/guestStorage", () => ({
  addGuestCourse: jest.fn(),
  getGuestCourses: jest.fn(),
}));

jest.mock("@/components/BackHeader", () => {
  return function MockBackHeader() {
    return null;
  };
});

jest.mock("@/components/classes/ClassInfoCard", () => {
  return function MockClassInfoCard() {
    return null;
  };
});

jest.mock("@/components/classes/AddClassInfoForm", () => {
  const React = require("react");
  const { TouchableOpacity, Text } = require("react-native");

  return function MockAddClassInfoForm({ onAdd }: any) {
    return (
      <TouchableOpacity
        testID="mock-add-class-info"
        onPress={() =>
          onAdd({
            type: "lecture",
            section: "A",
            day: "Monday",
            startTime: "10:15",
            endTime: "11:30",
            buildingCode: "H",
            room: "820",
          })
        }
      >
        <Text>Add Mock Class</Text>
      </TouchableOpacity>
    );
  };
});

describe("AddClassScreen - logged in", () => {
  const invalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries,
    });

    (useGetProfile as jest.Mock).mockReturnValue({
      data: { id: "user-123", name: "Test User" },
    });

    (getGuestCourses as jest.Mock).mockResolvedValue([]);
    (addCourse as jest.Mock).mockResolvedValue({});
    (addClassItem as jest.Mock).mockResolvedValue({});
  });

  it("saves class to backend when user is logged in", async () => {
    const { getByPlaceholderText, getByText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "COMP 248");

    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    fireEvent.press(getByTestId("mock-add-class-info"));
    fireEvent.press(getByText("Save Class"));

    await waitFor(() => {
      expect(addCourse).toHaveBeenCalledWith({ name: "COMP 248" });
    });

    await waitFor(() => {
      expect(addClassItem).toHaveBeenCalledWith(
        "COMP 248",
        expect.objectContaining({
          type: "lecture",
          section: "A",
          day: "Monday",
          startTime: "10:15",
          endTime: "11:30",
          buildingCode: "H",
          room: "820",
          origin: "manual",
        }),
      );
    });

    expect(addGuestCourse).not.toHaveBeenCalled();

    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["courses"],
    });

    expect(router.push).toHaveBeenCalledWith("/schedule");
  });
});