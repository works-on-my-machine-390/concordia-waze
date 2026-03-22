import { normalizeScheduleCourses } from "@/app/utils/schedule/normalizeScheduleCourses";
import type { CourseItem } from "@/hooks/queries/googleCalendarQueries";

describe("normalizeScheduleCourses", () => {
  test("normalizes course type, day, time, and trims strings", () => {
    const input: CourseItem[] = [
      {
        name: "SOEN 341",
        classes: [
          {
            type: "lec",
            section: " AA ",
            day: "Monday",
            startTime: "9:0",
            endTime: "10:5",
            buildingCode: " H ",
            room: " 110 ",
          },
        ],
      },
    ];

    const result = normalizeScheduleCourses(input);

    expect(result).toEqual([
      {
        name: "SOEN 341",
        classes: [
          {
            type: "Lecture",
            section: "AA",
            day: "MON",
            startTime: "09:00",
            endTime: "10:05",
            buildingCode: "H",
            room: "110",
          },
        ],
      },
    ]);
  });

  test("supports uppercase short forms for day and type", () => {
    const input: CourseItem[] = [
      {
        name: "COMP 346",
        classes: [
          {
            type: "LAB",
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

    const result = normalizeScheduleCourses(input);

    expect(result[0].classes[0]).toEqual({
      type: "Lab",
      section: "BB",
      day: "TUE",
      startTime: "13:00",
      endTime: "15:00",
      buildingCode: "MB",
      room: "2.130",
    });
  });

  test("falls back to safe defaults when optional fields are missing", () => {
    const input: CourseItem[] = [
      {
        name: "SOEN 363",
        classes: [
          {
            type: "",
            section: "",
            day: "",
            startTime: "",
            endTime: "",
          },
        ],
      },
    ];

    const result = normalizeScheduleCourses(input);

    expect(result[0].classes[0]).toEqual({
      type: "Lecture",
      section: "",
      day: "MON",
      startTime: "",
      endTime: "",
      buildingCode: "",
      room: "",
    });
  });

  test("handles missing classes array safely", () => {
    const input = [
      {
        name: "SOEN 384",
        classes: undefined,
      },
    ] as unknown as CourseItem[];

    const result = normalizeScheduleCourses(input);

    expect(result).toEqual([
      {
        name: "SOEN 384",
        classes: [],
      },
    ]);
  });

  test("handles empty input", () => {
    expect(normalizeScheduleCourses([])).toEqual([]);
  });
});