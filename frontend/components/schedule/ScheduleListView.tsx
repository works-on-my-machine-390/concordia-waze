import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import type { NormalizedScheduleCourse } from "../../app/utils/schedule/types";
import type { CourseItem } from "../../hooks/queries/googleCalendarQueries";
import ScheduleClassCard from "./ScheduleClassCard";

type Props = {
  courses: NormalizedScheduleCourse[];
  rawCourses: CourseItem[];
};

export default function ScheduleListView({
  courses,
  rawCourses,
}: Readonly<Props>) {
  const router = useRouter();

  const allClasses = courses.flatMap((course, courseIdx) =>
    course.classes.map((classItem, classIdx) => ({
      courseName: course.name,
      classItem,
      courseIdx,
      classIdx,
    })),
  );

  return (
    <BottomSheetScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upcoming Classes</Text>

      <View style={styles.list}>
        {allClasses.map(({ courseName, classItem, courseIdx, classIdx }, index) => {
          const backgroundColor =
            index % 2 === 0 ? COLORS.maroon : COLORS.selectionBlue;

          const rawClass = rawCourses[courseIdx]?.classes?.[classIdx];
          const classId = rawClass?.itemId ?? rawClass?.classId ?? "";

          const handleEdit = () =>
            router.push({
              pathname: "/edit-class" as any,
              params: {
                courseName,
                classId,
                classIndex: String(classIdx),
                type: classItem.type,
                section: classItem.section,
                day: classItem.day,
                startTime: classItem.startTime,
                endTime: classItem.endTime,
                buildingCode: classItem.buildingCode,
                room: classItem.room,
                isRecurring: "false",
              },
            });

          return (
            <ScheduleClassCard
              key={`${courseName}-${classItem.day}-${classItem.startTime}-${index}`}
              courseName={courseName}
              classInfo={classItem}
              backgroundColor={backgroundColor}
              textColor={COLORS.white}
              onEdit={handleEdit}
            />
          );
        })}
      </View>
    </BottomSheetScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  list: {
    gap: 10,
  },
});