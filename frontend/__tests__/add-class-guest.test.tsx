import AddClassScreen from "@/app/add-class";
import { useQueryClient } from "@tanstack/react-query";
import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { useCourses } from "@/hooks/queries/googleCalendarQueries";

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: () => ({ data: null }),
}));

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock("@/components/BackHeader", () => () => null);

jest.mock("@/components/classes/AddClassInfoForm", () => {
  const { forwardRef } = require("react");
  return forwardRef(({ onAdd, onCancel }: any, _ref) => {
    const { View, TouchableOpacity, Text } = require("react-native");
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
  getGuestCourses: jest
    .fn()
    .mockResolvedValue([{ name: "COMP 352", classes: [] }]),
  addGuestCourse: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: jest.fn(),
}));

jest.mock("@/app/utils/courseUtils", () => ({
  buildCourseItem: jest.fn().mockReturnValue({ name: "SOEN 384", classes: [] }),
}));

describe("AddClassScreen (guest)", () => {
  const invalidateQueries = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useQueryClient as jest.Mock).mockReturnValue({
      invalidateQueries,
    });
    (useCourses as jest.Mock).mockReturnValue({
      data: [],
    });
  });

  test("loads stored courses on focus", async () => {
    const { getGuestCourses } = require("@/hooks/guestStorage");
    render(<AddClassScreen />);
    await waitFor(() => expect(getGuestCourses).toHaveBeenCalled());
  });

  test("shows duplicate course name error", async () => {
    const { getByText, getByPlaceholderText } = render(<AddClassScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText("e.g. SOEN 384")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "COMP 352");
    });

    await act(async () => {
      fireEvent.press(
        getByText("Add a lecture, lab or tutorial for this course"),
      );
    });

    await waitFor(() => {
      expect(
        getByText(/A course named COMP 352 already exists/),
      ).toBeTruthy();
    });
  });

  test("saves course to guest storage and navigates when save is pressed", async () => {
    const { addGuestCourse } = require("@/hooks/guestStorage");
    const { router } = require("expo-router");

    const { getByText, getByPlaceholderText, getByTestId } = render(
      <AddClassScreen />,
    );

    await waitFor(() => {
      expect(getByPlaceholderText("e.g. SOEN 384")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    });

    await act(async () => {
      fireEvent.press(
        getByText("Add a lecture, lab or tutorial for this course"),
      );
    });

    await waitFor(() => {
      expect(getByTestId("mock-add")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("mock-add"));
    });

    await waitFor(() => {
      expect(getByText("Save Class")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await waitFor(() => expect(addGuestCourse).toHaveBeenCalled());
    expect(router.push).toHaveBeenCalledWith("/schedule");
  });

  test("shows save error when saving fails", async () => {
    const { addGuestCourse } = require("@/hooks/guestStorage");
    addGuestCourse.mockRejectedValueOnce(new Error("Storage error"));

    const { getByText, getByPlaceholderText, getByTestId, findByText } =
      render(<AddClassScreen />);

    await waitFor(() => {
      expect(getByPlaceholderText("e.g. SOEN 384")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    });

    await act(async () => {
      fireEvent.press(
        getByText("Add a lecture, lab or tutorial for this course"),
      );
    });

    await waitFor(() => {
      expect(getByTestId("mock-add")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByTestId("mock-add"));
    });

    await waitFor(() => {
      expect(getByText("Save Class")).toBeTruthy();
    });

    await act(async () => {
      fireEvent.press(getByText("Save Class"));
    });

    await findByText("Saving failed. Please try again.");
  });
});