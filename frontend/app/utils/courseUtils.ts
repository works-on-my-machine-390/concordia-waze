import { ClassInfoFormData } from "../../components/classes/AddClassInfoForm";
import { CourseItem, ClassItem } from "../../hooks/firebase/useFirestore";

export const mapFormDataToClassItems = (
  classes: ClassInfoFormData[]
): ClassItem[] => {
  return classes.map((classData) => ({
    type: classData.type,
    section: classData.section,
    day: classData.day,
    startTime: classData.startTime,
    endTime: classData.endTime,
    buildingCode: classData.buildingCode,
    room: classData.room,
    origin: "manual" as const,
  }));
};

export const buildCourseItem = (
  name: string,
  classes: ClassInfoFormData[]
): CourseItem => {
  return {
    name,
    classes: mapFormDataToClassItems(classes),
  };
};