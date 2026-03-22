import AddClassScreen from "@/app/add-class";
import { useQueryClient } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: () => ({ data: { id: "user-123" } }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void | (() => void)) => {
    const React = require("react");
    React.useEffect(() => {
      const cleanup = cb();
      return typeof cleanup === "function" ? cleanup : undefined;
    }, []);
  },
}));

jest.mock("@/components/BackHeader", () => () => null);

jest.mock("@/components/classes/AddClassInfoForm", () => {
  const React = require("react");
  const { View, TouchableOpacity, Text } = require("react-native");

  return React.forwardRef(({ onAdd, onCancel }: any, _ref) => {
    return (
      <View>
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
  });
});

jest.mock("@/components/classes/ClassInfoCard", () => {
  return ({ onDelete }: any) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID="mock-delete" onPress={onDelete}>
        <Text>Mock Card</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock("@/hooks/guestStorage", () => ({
  getGuestCourses: jest.fn().mockResolvedValue([]),
  addGuestCourse: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: jest.fn(() => ({ data: [] })),
  addCourse: jest.fn().mockResolvedValue({}),
  addClassItem: jest.fn().mockResolvedValue({}),
}));

jest.mock("@/app/utils/courseUtils", () => ({
  buildCourseItem: jest.fn().mockImplementation(
    (_courseName: string, classInfo: any[]) => ({
      name: "SOEN 384",
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
    }),
  ),
}));

describe("AddClassScreen", () => {
  const invalidateQueries = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    invalidateQueries.mockResolvedValue(undefined);

    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries,
    });
  });

  test("renders title", () => {
    const { getByText } = render(<AddClassScreen />);
    getByText("Add a Course");
  });

  test("renders course name input", () => {
    const { getByPlaceholderText } = render(<AddClassScreen />);
    getByPlaceholderText("e.g. SOEN 384");
  });

  test("renders add session button", () => {
    const { getByText } = render(<AddClassScreen />);
    getByText("Add a lecture, lab or tutorial for this course");
  });

  test("shows error when clicking add session without course name", () => {
    const { getByText } = render(<AddClassScreen />);
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    getByText("Please enter a course name.");
  });

  test("clears error when user starts typing course name", () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AddClassScreen />,
    );
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    getByText("Please enter a course name.");
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    expect(queryByText("Please enter a course name.")).toBeNull();
  });

  test("shows session form when course name is entered and add session is pressed", () => {
    const { getByText, getByPlaceholderText, queryByText } = render(
      <AddClassScreen />,
    );
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(
      getByText("Add a lecture, lab or tutorial for this course"),
    );
    expect(
      queryByText("Add a lecture, lab or tutorial for this course"),
    ).toBeNull();
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
    getByText("Save Class");
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
    fireEvent.press(getByTestId("mock-delete"));
    expect(queryByText("Save Class")).toBeNull();
  });

  test("saves to backend and not guest storage when user is logged in", async () => {
    const { addGuestCourse } = require("@/hooks/guestStorage");
    const {
      addCourse,
      addClassItem,
    } = require("@/hooks/queries/googleCalendarQueries");
    const { router } = require("expo-router");

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
      expect(addCourse).toHaveBeenCalledWith({ name: "SOEN 384" });
      expect(addClassItem).toHaveBeenCalledWith(
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
      expect(addGuestCourse).not.toHaveBeenCalled();
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["courses"],
      });

      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["nextClass"],
      });

      expect(router.push).toHaveBeenCalledWith("/schedule");
    });
  });
});