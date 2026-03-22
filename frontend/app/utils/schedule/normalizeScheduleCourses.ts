import type { CourseItem } from "@/hooks/queries/googleCalendarQueries";
import type {
  NormalizedScheduleClassType,
  NormalizedScheduleCourse,
  NormalizedScheduleDay,
} from "./types";

const typeMap: Record<string, NormalizedScheduleClassType> = {
  lecture: "Lecture",
  lec: "Lecture",
  lab: "Lab",
  tutorial: "Tutorial",
  tut: "Tutorial",
};

const dayMap: Record<string, NormalizedScheduleDay> = {
  Sunday: "SUN",
  Monday: "MON",
  Tuesday: "TUE",
  Wednesday: "WED",
  Thursday: "THU",
  Friday: "FRI",
  Saturday: "SAT",
  SUN: "SUN",
  MON: "MON",
  TUE: "TUE",
  WED: "WED",
  THU: "THU",
  FRI: "FRI",
  SAT: "SAT",
};

function normalizeTime(value?: string): string {
  if (!value) return "";

  const [hour = "0", minute = "0"] = value.split(":");
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

export function normalizeScheduleCourses(
  courses: CourseItem[],
): NormalizedScheduleCourse[] {
  return courses.map((course) => ({
    name: course.name ?? "",
    classes: (course.classes ?? []).map((classItem) => ({
      type: typeMap[classItem.type?.toLowerCase() ?? "lec"] ?? "Lecture",
      section: classItem.section?.trim() ?? "",
      day: dayMap[classItem.day] ?? "MON",
      startTime: normalizeTime(classItem.startTime),
      endTime: normalizeTime(classItem.endTime),
      buildingCode: classItem.buildingCode?.trim() ?? "",
      room: classItem.room?.trim() ?? "",
    })),
  }));
}