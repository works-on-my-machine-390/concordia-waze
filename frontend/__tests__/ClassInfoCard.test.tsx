import { fireEvent, render } from "@testing-library/react-native";
import ClassInfoCard from "@/components/classes/ClassInfoCard";

jest.mock("@/app/icons", () => ({
  DeleteIcon: () => null,
}));

const mockOnDelete = jest.fn();

const defaultProps = {
  courseName: "soen 384",
  classInfo: {
    type: "Lecture" as const,
    section: "N",
    day: "MON" as const,
    startTime: "10:00",
    endTime: "12:00",
    buildingCode: "h",
    room: "110",
  },
  onDelete: mockOnDelete,
};

describe("ClassInfoCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders course name in uppercase", () => {
    const { getByText } = render(<ClassInfoCard {...defaultProps} />);
    getByText("SOEN 384 - N");
  });

  test("renders section in uppercase with dashes replaced by spaces", () => {
    const { getByText } = render(
      <ClassInfoCard
        {...defaultProps}
        classInfo={{ ...defaultProps.classInfo, section: "N-A" }}
      />,
    );
    getByText("SOEN 384 - N A");
  });

  test("renders session type", () => {
    const { getByText } = render(<ClassInfoCard {...defaultProps} />);
    getByText("Lecture");
  });

  test("renders day and time", () => {
    const { getByText } = render(<ClassInfoCard {...defaultProps} />);
    getByText("MON 10:00 - 12:00");
  });

  test("renders building code and room in uppercase", () => {
    const { getByText } = render(<ClassInfoCard {...defaultProps} />);
    getByText("H 110");
  });
});
