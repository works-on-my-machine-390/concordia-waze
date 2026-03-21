import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import type { NormalizedScheduleCourse } from "../../app/utils/schedule/types";
import ScheduleClassCard from "./ScheduleClassCard";

type Props = {
  courses: NormalizedScheduleCourse[];
};

export default function ScheduleListView({ courses }: Readonly<Props>) {
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
          const backgroundColor = index % 2 === 0 ? COLORS.maroon : COLORS.selectionBlue;

          return (
            <ScheduleClassCard
              key={`${courseName}-${classItem.day}-${classItem.startTime}-${index}`}
              courseName={courseName}
              classInfo={classItem}
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