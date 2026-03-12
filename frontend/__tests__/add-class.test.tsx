import { fireEvent, render } from "@testing-library/react-native";
import AddClassScreen from "@/app/add-class";

jest.mock("@/components/BackHeader", () => () => null);
jest.mock("@/components/classes/AddClassInfoForm", () => {
  const { forwardRef } = require("react");
  return forwardRef(({ onAdd, onCancel }: any, ref: any) => {
    const { View, TouchableOpacity, Text } = require("react-native");
    return (
      <View>
        <TouchableOpacity testID="mock-add" onPress={() => onAdd({
          type: "Lecture",
          section: "N",
          day: "MON",
          start_time: "10:00",
          end_time: "12:00",
          buildingCode: "H",
          room: "110",
        })}>
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

describe("AddClassScreen", () => {
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
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    getByText("Please enter a course name first.");
  });

  test("clears error when user starts typing course name", () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<AddClassScreen />);
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    getByText("Please enter a course name first.");
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    expect(queryByText("Please enter a course name first.")).toBeNull();
  });

  test("shows session form when course name is entered and add session is pressed", () => {
    const { getByText, getByPlaceholderText, queryByText } = render(<AddClassScreen />);
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    expect(queryByText("Add a lecture, lab or tutorial for this course")).toBeNull();
  });

  test("save button does not appear when no sessions added", () => {
    const { queryByText } = render(<AddClassScreen />);
    expect(queryByText("Save Class")).toBeNull();
  });

  test("adds session and shows save button when onAdd is called", () => {
    const { getByText, getByPlaceholderText, getByTestId } = render(<AddClassScreen />);
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    fireEvent.press(getByTestId("mock-add"));
    getByText("Save Class");
  });

  test("hides form when onCancel is called", () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByText } = render(<AddClassScreen />);
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    fireEvent.press(getByTestId("mock-cancel"));
    expect(queryByText("Add a lecture, lab or tutorial for this course")).toBeTruthy();
  });

  test("deletes session when onDelete is called", () => {
    const { getByText, getByPlaceholderText, getByTestId, queryByText } = render(<AddClassScreen />);
    fireEvent.changeText(getByPlaceholderText("e.g. SOEN 384"), "SOEN 384");
    fireEvent.press(getByText("Add a lecture, lab or tutorial for this course"));
    fireEvent.press(getByTestId("mock-add"));
    fireEvent.press(getByTestId("mock-delete"));
    expect(queryByText("Save Class")).toBeNull();
  });
});