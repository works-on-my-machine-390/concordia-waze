import React from "react";
import AddClassScreen from "@/app/add-class";
import { useQueryClient } from "@tanstack/react-query";
import {
  act,
  fireEvent,
  render,
  waitFor,
} from "@testing-library/react-native";

const mockPush = jest.fn();
const mockUseGetProfile = jest.fn();
const mockUseCourses = jest.fn();
const mockAddCourse = jest.fn();
const mockAddClassItem = jest.fn();
const mockGetGuestCourses = jest.fn();
const mockAddGuestCourse = jest.fn();
const mockBuildCourseItem = jest.fn();
const mockValidateCourseName = jest.fn();
const mockValidateNoDuplicateCourseName = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: () => mockUseGetProfile(),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: () => mockUseCourses(),
  addCourse: (...args: any[]) => mockAddCourse(...args),
  addClassItem: (...args: any[]) => mockAddClassItem(...args),
}));

jest.mock("@/hooks/guestStorage", () => ({
  getGuestCourses: () => mockGetGuestCourses(),
  addGuestCourse: (...args: any[]) => mockAddGuestCourse(...args),
}));

jest.mock("../app/utils/classValidationUtils", () => ({
  validateCourseName: (...args: any[]) => mockValidateCourseName(...args),
  validateNoDuplicateCourseName: (...args: any[]) =>
    mockValidateNoDuplicateCourseName(...args),
}));

jest.mock("../app/utils/courseUtils", () => ({
  buildCourseItem: (...args: any[]) => mockBuildCourseItem(...args),
}));

jest.mock("expo-router", () => ({
  router: { push: (...args: any[]) => mockPush(...args) },
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === "function" ? cleanup : undefined;
    }, [cb]);
  },
}));

jest.mock("@/components/BackHeader", () => () => null);

jest.mock("@/components/classes/AddClassInfoForm", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");

  return React.forwardRef(
    ({ onAdd, onCancel, existingSessions }: any, _ref: any) => {
      return (
        <View>
          <Text testID="existing-sessions-count">
            {String(existingSessions?.length ?? 0)}
          </Text>

          <TouchableOpacity
            testID="mock-add"
            onPress={() =>
              onAdd({
                type: "Lecture",
                section: "N",
                day: "MON",
                startTime: "10:00",
                endTime: "12:00",
                buildingCode: "H",
                room: "110",
              })
            }
          >
            <Text>Mock Add</Text>
          </TouchableOpacity>

          <TouchableOpacity testID="mock-cancel" onPress={onCancel}>
            <Text>Mock Cancel</Text>
          </TouchableOpacity>
        </View>
      );
    },
  );
});

jest.mock("@/components/classes/ClassInfoCard", () => {
  return ({ onDelete, courseName, classInfo }: any) => {
    const { TouchableOpacity, Text, View } = require("react-native");
    return (
      <View>
        <Text>{courseName}</Text>
        <Text>{classInfo.type}</Text>
        <TouchableOpacity testID="mock-delete" onPress={onDelete}>
          <Text>Mock Card</Text>
        </TouchableOpacity>
      </View>
    );
  };
});

describe("AddClassScreen", () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries,
    });

    mockUseGetProfile.mockReturnValue({ data: { id: "user-123" } });
    mockUseCourses.mockReturnValue({ data: [] });

    mockAddCourse.mockResolvedValue({});
    mockAddClassItem.mockResolvedValue({});
    mockGetGuestCourses.mockResolvedValue([]);
    mockAddGuestCourse.mockResolvedValue(undefined);

    mockValidateCourseName.mockReturnValue(null);
    mockValidateNoDuplicateCourseName.mockReturnValue(null);

    mockBuildCourseItem.mockImplementation((courseName: string, classInfo: any[]) => ({
      name: courseName,
      classes: classInfo.map((item) => ({
        type: item.type,
        section: item.section,
        day: item.day,
        startTime: item.startTime,
        endTime: item.endTime,
        buildingCode: item.buildingCode,
        room: item.room,
        origin: "manual",
      })),
    }));
  });

  test("renders title", () => {
    const { getByText } = render(<AddClassScreen />);
    expect(getByText("Add a Course")).toBeTruthy();
  });

  test("renders course name input", () => {
    const { getByPlaceholderText } = render(<AddClassScreen />);
    expect(getByPlaceholderText("e.g. SOEN 384")).toBeTruthy();
  });

  test("renders add session button", () => {
    const { getByText } = render(<AddClassScreen />);
    expect(
      getByText("Add a lecture, lab or tutorial for this course"),
    ).toBeTruthy();
  });

  test("shows validation error when clicking add session without course name", () => {
    mockValidateCourseName.mockReturnValue("Please enter a course name.");

    const { getByText } = render(<AddClassScreen />);
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );

    expect(getByText("Please enter a course name.")).toBeTruthy();
  });

  test("clears validation error when user starts typing", () => {
    mockValidateCourseName.mockReturnValue("Please enter a course name.");

    const { getByText, getByPlaceholderText, queryByText } = render(
      <AddClassScreen />,
    );

    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    expect(getByText("Please enter a course name.")).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");

    expect(queryByText("Please enter a course name.")).toBeNull();
  });

  test("shows duplicate course name error", () => {
    mockValidateNoDuplicateCourseName.mockReturnValue(
      "This course already exists.",
    );

    const { getByText, getByPlaceholderText } = render(<AddClassScreen />);

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );

    expect(getByText("This course already exists.")).toBeTruthy();
  });

  test("shows session form when course name is valid", () => {
    const { getByText, getByPlaceholderText, queryByText, getByTestId } =
      render(<AddClassScreen />);

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );

    expect(
      queryByText("Add a lecture, lab or tutorial for this course"),
    ).toBeNull();
    expect(getByTestId("existing-sessions-count")).toBeTruthy();
  });

  test("save button does not appear when no sessions added", () => {
    const { queryByText } = render(<AddClassScreen />);
    expect(queryByText("Save Class")).toBeNull();
  });

  test("adds session and shows save button when onAdd is called", () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    expect(getByText("Save Class")).toBeTruthy();
    expect(getByText("Lecture")).toBeTruthy();
  });

  test("hides form when onCancel is called", () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByText } =
      render(<AddClassScreen />);

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-cancel"));

    expect(
      queryByText("Add a lecture, lab or tutorial for this course"),
    ).toBeTruthy();
  });

  test("deletes session when onDelete is called", () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByText } =
      render(<AddClassScreen />);

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    expect(getByText("Save Class")).toBeTruthy();

    fireEvent.press(getByTestId("mock-delete"));

    expect(queryByText("Save Class")).toBeNull();
  });

  test("loads synced courses into existingSessions for logged in user", async () => {
    mockUseGetProfile.mockReturnValue({ data: { id: "user-123" } });
    mockUseCourses.mockReturnValue({
      data: [
        {
          name: "COMP 248",
          classes: [
            {
              type: "lecture",
              section: "A",
              day: "MON",
              startTime: "08:45",
              endTime: "10:00",
              buildingCode: "H",
              room: "937",
            },
            {
              type: "tut",
              section: "T",
              day: "WED",
              startTime: "11:00",
              endTime: "12:00",
              buildingCode: "H",
              room: "801",
            },
            {
              type: "unknown",
              section: "X",
              day: "FRI",
              startTime: "13:00",
              endTime: "14:00",
            },
          ],
        },
      ],
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );

    await waitFor(() => {
      expect(getByTestId("existing-sessions-count").props.children).toBe("2");
    });
  });

  test("loads guest courses into existingSessions for guest user", async () => {
    mockUseGetProfile.mockReturnValue({ data: null });
    mockGetGuestCourses.mockResolvedValue([
      {
        name: "SOEN 287",
        classes: [
          {
            type: "lab",
            section: "Q",
            day: "TUE",
            startTime: "14:00",
            endTime: "16:00",
            buildingCode: "MB",
            room: "2.130",
          },
        ],
      },
    ]);

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
      expect(getByTestId("existing-sessions-count").props.children).toBe("1");
    });
  });

  test("saves to backend and not guest storage when user is logged in", async () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => {
      expect(mockAddCourse).toHaveBeenCalledWith({ name: "SOEN 384" });

      expect(mockAddClassItem).toHaveBeenCalledWith(
        "SOEN 384",
        expect.objectContaining({
          type: "Lecture",
          section: "N",
          day: "MON",
          startTime: "10:00",
          endTime: "12:00",
          buildingCode: "H",
          room: "110",
          origin: "manual",
        }),
      );

      expect(mockAddGuestCourse).not.toHaveBeenCalled();

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["courses"],
      });
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["nextClass"],
      });

      expect(mockPush).toHaveBeenCalledWith("/schedule");
    });
  });

  test("still saves classes when addCourse throws for logged in user", async () => {
    mockAddCourse.mockRejectedValue(new Error("already exists"));

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => {
      expect(mockAddCourse).toHaveBeenCalled();
      expect(mockAddClassItem).toHaveBeenCalledTimes(1);
      expect(mockPush).toHaveBeenCalledWith("/schedule");
    });
  });

  test("saves to guest storage when user is not logged in", async () => {
    mockUseGetProfile.mockReturnValue({ data: null });

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => {
      expect(mockAddGuestCourse).toHaveBeenCalledWith({
        name: "SOEN 384",
        classes: [
          expect.objectContaining({
            type: "Lecture",
            section: "N",
            day: "MON",
            startTime: "10:00",
            endTime: "12:00",
            buildingCode: "H",
            room: "110",
            origin: "manual",
          }),
        ],
      });

      expect(mockAddCourse).not.toHaveBeenCalled();
      expect(mockAddClassItem).not.toHaveBeenCalled();
      expect(invalidateQueries).not.toHaveBeenCalled();
      expect(mockPush).toHaveBeenCalledWith("/schedule");
    });
  });

  test("does not save when validation fails on save", async () => {
    mockValidateCourseName.mockImplementation((name: string) =>
      name === "SOEN 384" ? null : "Please enter a course name.",
    );

    const { getByText } = render(<AddClassScreen />);

    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));

    expect(getByText("Please enter a course name.")).toBeTruthy();
    expect(mockAddGuestCourse).not.toHaveBeenCalled();
    expect(mockAddCourse).not.toHaveBeenCalled();
  });

  test("shows save error when guest save fails", async () => {
    mockUseGetProfile.mockReturnValue({ data: null });
    mockAddGuestCourse.mockRejectedValue(new Error("storage failed"));

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => {
      expect(getByText("Saving failed. Please try again.")).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });

  test("shows save error when buildCourseItem throws", async () => {
    mockBuildCourseItem.mockImplementation(() => {
      throw new Error("build failed");
    });

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    fireEvent.press(getByTestId("mock-add"));

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => {
      expect(getByText("Saving failed. Please try again.")).toBeTruthy();
      expect(mockPush).not.toHaveBeenCalled();
    });
  });
});