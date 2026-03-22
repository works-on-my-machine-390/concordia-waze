export const SCHEDULE_DAYS = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

export const SCHEDULE_CLASS_TYPES = [
  "Lecture",
  "Lab",
  "Tutorial",
] as const;

export type NormalizedScheduleDay = (typeof SCHEDULE_DAYS)[number];
export type NormalizedScheduleClassType = (typeof SCHEDULE_CLASS_TYPES)[number];

export type NormalizedScheduleClass = {
  type: NormalizedScheduleClassType;
  section: string;
  day: NormalizedScheduleDay;
  startTime: string;
  endTime: string;
  buildingCode: string;
  room: string;
};

export type NormalizedScheduleCourse = {
  name: string;
  classes: NormalizedScheduleClass[];
};