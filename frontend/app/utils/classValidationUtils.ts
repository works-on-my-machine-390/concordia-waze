export const validateCourseName = (name: string): string | null => {
  if (!name.trim()) return "Please enter a course name.";
  return null;
};

export const validateSection = (section: string): string | null => {
  if (!section.trim()) return "Please enter a section.";
  if (!/^[a-zA-Z-]+$/.test(section))
    return "Section can only contain letters and dashes.";
  return null;
};

export const validateTime = (time: string): string | null => {
  if (!time.trim()) return "Please enter a time.";
  if (!/^\d{1,2}:\d{2}$/.test(time))
    return "Time must be in H:MM or HH:MM format.";
  const [hours, minutes] = time.split(":").map(Number);
  if (hours < 0 || hours > 23) return "Hours must be between 0 and 23.";
  if (minutes < 0 || minutes > 59) return "Minutes must be between 0 and 59.";
  return null;
};

export const validateTimeRange = (
  start: string,
  end: string,
): string | null => {
  const [startHours, startMinutes] = start.split(":").map(Number);
  const [endHours, endMinutes] = end.split(":").map(Number);
  const startTotal = startHours * 60 + startMinutes;
  const endTotal = endHours * 60 + endMinutes;
  if (endTotal <= startTotal) return "End time must be after start time.";
  return null;
};

export const validateNoTimeOverlap = (
  newSession: { day: string; start_time: string; end_time: string },
  existingSessions: { day: string; start_time: string; end_time: string }[],
): string | null => {
  const toMinutes = (time: string): number => {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  };

  const newStart = toMinutes(newSession.start_time);
  const newEnd = toMinutes(newSession.end_time);

  for (const session of existingSessions) {
    if (session.day !== newSession.day) continue;
    const existingStart = toMinutes(session.start_time);
    const existingEnd = toMinutes(session.end_time);
    if (newStart < existingEnd && newEnd > existingStart) {
      return `This class overlaps with an existing class.`;
    }
  }
  return null;
};

export const validateClassInfoForm = (
  type: string | null,
  section: string,
  day: string | null,
  startTime: string,
  endTime: string,
  buildingCode: string,
  room: string,
): string | null => {
  const emptyFields = [
    !type,
    !day,
    !section.trim(),
    !startTime.trim(),
    !endTime.trim(),
    !buildingCode.trim(),
    !room.trim(),
  ].filter(Boolean).length;

  if (emptyFields > 1) return "Please fill in all fields.";

  if (!type) return "Please select a class type (lecture, lab, tutorial).";
  if (!day) return "Please select a day.";
  const sectionError = validateSection(section);
  if (sectionError) return sectionError;
  const startError = validateTime(startTime);
  if (startError) return startError;
  const endError = validateTime(endTime);
  if (endError) return endError;
  const rangeError = validateTimeRange(startTime, endTime);
  if (rangeError) return rangeError;
  if (!buildingCode.trim()) return "Please enter a building code.";
  if (!room.trim()) return "Please enter a room.";
  return null;
};
