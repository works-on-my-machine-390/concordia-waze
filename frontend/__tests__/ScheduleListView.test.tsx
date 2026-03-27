import ScheduleListView from "@/components/schedule/ScheduleListView";
import { render } from "@testing-library/react-native";
import type { NormalizedScheduleCourse } from "@/app/utils/schedule/types";

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { ScrollView } = require("react-native");

  return {
    BottomSheetScrollView: ({ children, ...props }: any) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

describe("ScheduleListView", () => {
  test("renders upcoming classes title and all class cards", () => {
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
      {
        name: "COMP 346",
        classes: [
          {
            type: "Lab",
            section: "BB",
            day: "TUE",
            startTime: "13:00",
            endTime: "15:00",
            buildingCode: "MB",
            room: "2.130",
          },
        ],
      },
    ];

    const rawCourses = [
      { classes: [{ itemId: "item-1" }] },
      { classes: [{ itemId: "item-2" }] },
    ] as any;

    const { getByText } = render(
      <ScheduleListView courses={courses} rawCourses={rawCourses} />,
    );

    expect(getByText("Upcoming Classes")).toBeTruthy();
    expect(getByText("SOEN 341 - AA")).toBeTruthy();
    expect(getByText("Lecture")).toBeTruthy();
    expect(getByText("COMP 346 - BB")).toBeTruthy();
    expect(getByText("Lab")).toBeTruthy();
  });

  test("renders title when there are no courses", () => {
    const courses: NormalizedScheduleCourse[] = [];

    const { getByText } = render(
      <ScheduleListView courses={courses} rawCourses={[]} />,
    );

    expect(getByText("Upcoming Classes")).toBeTruthy();
  });

  test("renders class with empty section without trailing hyphen", () => {
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
            buildingCode: "H",
            room: "937",
          },
        ],
      },
    ];

    const rawCourses = [
      { classes: [{ itemId: "item-1" }] },
    ] as any;

    const { getByText, queryByText } = render(
      <ScheduleListView courses={courses} rawCourses={rawCourses} />,
    );

    expect(getByText("SOEN 363")).toBeTruthy();
    expect(queryByText("SOEN 363 - ")).toBeNull();
    expect(getByText("Tutorial")).toBeTruthy();
  });
});