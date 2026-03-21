import WeeklyScheduleView from "@/components/schedule/WeeklyScheduleView";
import { render } from "@testing-library/react-native";
import type { NormalizedScheduleCourse } from "@/app/utils/schedule/types";

jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => callback(),
}));

describe("WeeklyScheduleView", () => {
  test("renders weekday headers and class content", () => {
    const courses: NormalizedScheduleCourse[] = [
      {
        name: "SOEN 341",
        classes: [
          {
            type: "Lecture",
            section: "AA",
            day: "MON",
            startTime: "10:00",
            endTime: "11:15",
            buildingCode: "H",
            room: "110",
          },
        ],
      },
    ];

    const { getByText } = render(<WeeklyScheduleView courses={courses} />);

    expect(getByText("MON")).toBeTruthy();
    expect(getByText("TUE")).toBeTruthy();
    expect(getByText("WED")).toBeTruthy();

    expect(getByText("SOEN 341")).toBeTruthy();
    expect(getByText("Lecture")).toBeTruthy();
    expect(getByText("10:00 - 11:15")).toBeTruthy();
    expect(getByText("H 110")).toBeTruthy();
  });

  test("does not render class block when end time is before start time", () => {
    const courses: NormalizedScheduleCourse[] = [
      {
        name: "COMP 346",
        classes: [
          {
            type: "Lab",
            section: "BB",
            day: "TUE",
            startTime: "15:00",
            endTime: "13:00",
            buildingCode: "MB",
            room: "2.130",
          },
        ],
      },
    ];

    const { queryByText } = render(<WeeklyScheduleView courses={courses} />);

    expect(queryByText("COMP 346")).toBeNull();
    expect(queryByText("Lab")).toBeNull();
    expect(queryByText("15:00 - 13:00")).toBeNull();
  });

  test("does not render class block when class starts before schedule start hour", () => {
    const courses: NormalizedScheduleCourse[] = [
      {
        name: "SOEN 384",
        classes: [
          {
            type: "Lecture",
            section: "CC",
            day: "FRI",
            startTime: "07:00",
            endTime: "08:00",
            buildingCode: "H",
            room: "110",
          },
        ],
      },
    ];

    const { queryByText } = render(<WeeklyScheduleView courses={courses} />);

    expect(queryByText("SOEN 384")).toBeNull();
    expect(queryByText("07:00 - 08:00")).toBeNull();
  });

  test("renders class block with empty location safely", () => {
    const courses: NormalizedScheduleCourse[] = [
      {
        name: "SOEN 363",
        classes: [
          {
            type: "Tutorial",
            section: "",
            day: "WED",
            startTime: "13:45",
            endTime: "16:00",
            buildingCode: "",
            room: "",
          },
        ],
      },
    ];

    const { getByText } = render(<WeeklyScheduleView courses={courses} />);

    expect(getByText("SOEN 363")).toBeTruthy();
    expect(getByText("Tutorial")).toBeTruthy();
    expect(getByText("13:45 - 16:00")).toBeTruthy();
  });
});