import {
  validateCourseName,
  validateSection,
  validateTime,
  validateTimeRange,
  validateNoTimeOverlap,
  validateClassInfoForm,
} from "../app/utils/classValidationUtils";

describe("validateCourseName", () => {
  test("returns error when empty", () => {
    expect(validateCourseName("")).toBe("Please enter a course name.");
  });

  test("returns error when only spaces", () => {
    expect(validateCourseName("   ")).toBe("Please enter a course name.");
  });

  test("returns null when valid", () => {
    expect(validateCourseName("SOEN 384")).toBeNull();
  });
});

describe("validateSection", () => {
  test("returns error when empty", () => {
    expect(validateSection("")).toBe("Please enter a section.");
  });

  test("returns error when contains numbers", () => {
    expect(validateSection("N1")).toBe("Section can only contain letters, spaces and dashes.");
  });

  test("returns null when only letters", () => {
    expect(validateSection("N")).toBeNull();
  });

  test("returns null when letters and dash", () => {
    expect(validateSection("N-A")).toBeNull();
  });

  test("returns null when letters and spaces", () => {
    expect(validateSection("N A")).toBeNull();
  });
});

describe("validateTime", () => {
  test("returns error when empty", () => {
    expect(validateTime("")).toBe("Please enter a time.");
  });

  test("returns error when wrong format", () => {
    expect(validateTime("9-00")).toBe("Time must be in H:MM or HH:MM format.");
  });

  test("returns error when hours out of range", () => {
    expect(validateTime("25:00")).toBe("Hours must be between 0 and 23.");
  });

  test("returns error when minutes out of range", () => {
    expect(validateTime("12:60")).toBe("Minutes must be between 0 and 59.");
  });

  test("returns null for valid 24h time", () => {
    expect(validateTime("15:30")).toBeNull();
  });

  test("returns null for single digit hour", () => {
    expect(validateTime("9:00")).toBeNull();
  });
});

describe("validateTimeRange", () => {
  test("returns error when end is before start", () => {
    expect(validateTimeRange("15:00", "14:00")).toBe("End time must be after start time.");
  });

  test("returns error when end equals start", () => {
    expect(validateTimeRange("15:00", "15:00")).toBe("End time must be after start time.");
  });

  test("returns null when end is after start", () => {
    expect(validateTimeRange("15:00", "16:30")).toBeNull();
  });
});

describe("validateNoTimeOverlap", () => {
  const existingSessions = [
    { day: "MON", startTime: "10:00", endTime: "12:00" },
  ];

  test("returns error when sessions overlap on same day", () => {
    expect(
      validateNoTimeOverlap(
        { day: "MON", startTime: "11:00", endTime: "13:00" },
        existingSessions
      )
    ).toBe("This class overlaps with an existing class.");
  });

  test("returns null when sessions are on different days", () => {
    expect(
      validateNoTimeOverlap(
        { day: "TUE", startTime: "11:00", endTime: "13:00" },
        existingSessions
      )
    ).toBeNull();
  });

  test("returns null when sessions are on same day but no overlap", () => {
    expect(
      validateNoTimeOverlap(
        { day: "MON", startTime: "12:00", endTime: "13:00" },
        existingSessions
      )
    ).toBeNull();
  });

  test("returns null when no existing sessions", () => {
    expect(
      validateNoTimeOverlap(
        { day: "MON", startTime: "10:00", endTime: "12:00" },
        []
      )
    ).toBeNull();
  });
});

describe("validateClassInfoForm", () => {
  const valid = {
    type: "Lecture" as const,
    section: "N",
    day: "MON",
    startTime: "10:00",
    endTime: "12:00",
    buildingCode: "H",
    room: "110",
  };

  test("returns error when more than one field is empty", () => {
    expect(
      validateClassInfoForm(null, "", "MON", "10:00", "12:00", "H", "110")
    ).toBe("Please fill in all fields.");
  });

  test("returns error when type is missing", () => {
    expect(
      validateClassInfoForm(null, valid.section, valid.day, valid.startTime, valid.endTime, valid.buildingCode, valid.room)
    ).toBe("Please select a class type (lecture, lab, tutorial).");
  });

  test("returns error when day is missing", () => {
    expect(
      validateClassInfoForm(valid.type, valid.section, null, valid.startTime, valid.endTime, valid.buildingCode, valid.room)
    ).toBe("Please select a day.");
  });

  test("returns error when building code is missing", () => {
    expect(
      validateClassInfoForm(valid.type, valid.section, valid.day, valid.startTime, valid.endTime, "", valid.room)
    ).toBe("Please enter a building code.");
  });

  test("returns error when room is missing", () => {
    expect(
      validateClassInfoForm(valid.type, valid.section, valid.day, valid.startTime, valid.endTime, valid.buildingCode, "")
    ).toBe("Please enter a room.");
  });

  test("returns null when all fields are valid", () => {
    expect(
      validateClassInfoForm(valid.type, valid.section, valid.day, valid.startTime, valid.endTime, valid.buildingCode, valid.room)
    ).toBeNull();
  });
  test("returns error when section is invalid", () => {
  expect(
    validateClassInfoForm(valid.type, "N1", valid.day, valid.startTime, valid.endTime, valid.buildingCode, valid.room)
  ).toBe("Section can only contain letters, spaces and dashes.");
});

test("returns error when start time is invalid", () => {
  expect(
    validateClassInfoForm(valid.type, valid.section, valid.day, "25:00", valid.endTime, valid.buildingCode, valid.room)
  ).toBe("Hours must be between 0 and 23.");
});

test("returns error when end time is invalid", () => {
  expect(
    validateClassInfoForm(valid.type, valid.section, valid.day, valid.startTime, "25:00", valid.buildingCode, valid.room)
  ).toBe("Hours must be between 0 and 23.");
});

test("returns error when end time is before start time", () => {
  expect(
    validateClassInfoForm(valid.type, valid.section, valid.day, "15:00", "14:00", valid.buildingCode, valid.room)
  ).toBe("End time must be after start time.");
});
});