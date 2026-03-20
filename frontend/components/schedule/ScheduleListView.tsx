import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import { CourseItem } from "../../hooks/firebase/useFirestore";
import ScheduleClassCard from "./ScheduleClassCard";

type Props = {
  courses: CourseItem[];
};

type ClassType = "Lecture" | "Lab" | "Tutorial";
type ClassDay = "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT";

export default function ScheduleListView({ courses }: Readonly<Props>) {
  const typeMap: Record<string, ClassType> = {
    lec: "Lecture",
    lab: "Lab",
    tutorial: "Tutorial",
  };

  const dayMap: Record<string, ClassDay> = {
    Sunday: "SUN",
    Monday: "MON",
    Tuesday: "TUE",
    Wednesday: "WED",
    Thursday: "THU",
    Friday: "FRI",
    Saturday: "SAT",
  };

  const allClasses = courses.flatMap((course) =>
    course.classes.map((classItem) => ({
      courseName: course.name,
      classItem,
    })),
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Upcoming Classes</Text>

      <View style={styles.list}>
        {allClasses.map(({ courseName, classItem }, index) => {
          const isEven = index % 2 === 0;
          const backgroundColor = isEven ? COLORS.maroon : "#4180C0";

          return (
            <ScheduleClassCard
              key={`${courseName}-${index}`}
              courseName={courseName}
              classInfo={{
                type:
                  typeMap[classItem.type?.toLowerCase() ?? "lec"] ?? "Lecture",
                section: classItem.section ?? "",
                day: dayMap[classItem.day] ?? "MON",
                startTime: classItem.startTime ?? "",
                endTime: classItem.endTime ?? "",
                buildingCode: classItem.buildingCode ?? "",
                room: classItem.room ?? "",
              }}
              backgroundColor={backgroundColor}
              textColor="#FFFFFF"
            />
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
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