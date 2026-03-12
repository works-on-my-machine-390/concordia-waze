import { fireEvent, render } from "@testing-library/react-native";
import AddClassInfoForm from "@/components/classes/AddClassInfoForm";

jest.mock("@/components/classes/ClassInfoTypeSelector", () => {
  return ({ onSelect }: any) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID="mock-type" onPress={() => onSelect("Lecture")}>
        <Text>Mock Type</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock("@/components/classes/ClassInfoDaySelector", () => {
  return ({ onSelect }: any) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID="mock-day" onPress={() => onSelect("MON")}>
        <Text>Mock Day</Text>
      </TouchableOpacity>
    );
  };
});

const mockOnAdd = jest.fn();
const mockOnCancel = jest.fn();

const defaultProps = {
  onAdd: mockOnAdd,
  onCancel: mockOnCancel,
  existingSessions: [],
};

const fillValidForm = (getByTestId: any, getByPlaceholderText: any) => {
  fireEvent.press(getByTestId("mock-type"));
  fireEvent.press(getByTestId("mock-day"));
  fireEvent.changeText(getByPlaceholderText("e.g. S JL"), "N");
  fireEvent.changeText(getByPlaceholderText("09:00"), "10:00");
  fireEvent.changeText(getByPlaceholderText("10:30"), "12:00");
  fireEvent.changeText(getByPlaceholderText("Building (e.g. H)"), "H");
  fireEvent.changeText(getByPlaceholderText("Room (e.g. 110)"), "110");
};

describe("AddClassInfoForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all labels", () => {
    const { getByText } = render(<AddClassInfoForm {...defaultProps} />);
    getByText("Class Type");
    getByText("Section");
    getByText("Day");
    getByText("Time");
    getByText("Location");
  });

  test("renders cancel and add buttons", () => {
    const { getByText } = render(<AddClassInfoForm {...defaultProps} />);
    getByText("Cancel");
    getByText("Add Class");
  });

  test("calls onCancel when cancel is pressed", () => {
    const { getByText } = render(<AddClassInfoForm {...defaultProps} />);
    fireEvent.press(getByText("Cancel"));
    expect(mockOnCancel).toHaveBeenCalled();
  });

  test("shows error when all fields are empty and add is pressed", () => {
    const { getByText } = render(<AddClassInfoForm {...defaultProps} />);
    fireEvent.press(getByText("Add Class"));
    getByText("Please fill in all fields.");
  });

  test("shows error when only type is missing", () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(
      <AddClassInfoForm {...defaultProps} />,
    );
    fireEvent.press(getByTestId("mock-day"));
    fireEvent.changeText(getByPlaceholderText("e.g. S JL"), "N");
    fireEvent.changeText(getByPlaceholderText("09:00"), "10:00");
    fireEvent.changeText(getByPlaceholderText("10:30"), "12:00");
    fireEvent.changeText(getByPlaceholderText("Building (e.g. H)"), "H");
    fireEvent.changeText(getByPlaceholderText("Room (e.g. 110)"), "110");
    fireEvent.press(getByText("Add Class"));
    getByText("Please select a class type (lecture, lab, tutorial).");
  });

  test("shows error when only day is missing", () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(
      <AddClassInfoForm {...defaultProps} />,
    );
    fireEvent.press(getByTestId("mock-type"));
    fireEvent.changeText(getByPlaceholderText("e.g. S JL"), "N");
    fireEvent.changeText(getByPlaceholderText("09:00"), "10:00");
    fireEvent.changeText(getByPlaceholderText("10:30"), "12:00");
    fireEvent.changeText(getByPlaceholderText("Building (e.g. H)"), "H");
    fireEvent.changeText(getByPlaceholderText("Room (e.g. 110)"), "110");
    fireEvent.press(getByText("Add Class"));
    getByText("Please select a day.");
  });

  test("shows overlap error when session overlaps existing one", () => {
    const existingSessions = [
      {
        type: "Lecture" as const,
        section: "N",
        day: "MON" as const,
        start_time: "10:00",
        end_time: "12:00",
        buildingCode: "H",
        room: "110",
      },
    ];
    const { getByText, getByTestId, getByPlaceholderText } = render(
      <AddClassInfoForm
        {...defaultProps}
        existingSessions={existingSessions}
      />,
    );
    fillValidForm(getByTestId, getByPlaceholderText);
    fireEvent.press(getByText("Add Class"));
    getByText("This class overlaps with an existing class.");
  });

  test("calls onAdd with correct data when form is valid", () => {
    const { getByText, getByTestId, getByPlaceholderText } = render(
      <AddClassInfoForm {...defaultProps} />,
    );
    fillValidForm(getByTestId, getByPlaceholderText);
    fireEvent.press(getByText("Add Class"));
    expect(mockOnAdd).toHaveBeenCalledWith({
      type: "Lecture",
      section: "N",
      day: "MON",
      start_time: "10:00",
      end_time: "12:00",
      buildingCode: "H",
      room: "110",
    });
  });
});
