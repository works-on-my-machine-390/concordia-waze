// The code here is for testing (and showing to PR reviewer) that guest storage works
// I just reused the class cards im using in the "Add course" page to show the classes here
// Whoever works on the schedule page can just delete all of it and start from scratch
// The trash button on the right of the class card doesn't work (since this was just for testing)

import ClassInfoCard from "@/components/classes/ClassInfoCard";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CourseItem } from "../../hooks/firebase/useFirestore";
import { getGuestCourses } from "../../hooks/guestStorage";
import { COLORS } from "../constants";
import { AddIcon } from "../icons";

export default function Schedule() {
  const router = useRouter();
  const [courses, setCourses] = useState<CourseItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await getGuestCourses();
        setCourses(stored);
      };
      load();
    }, []),
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/add-class",
              params: { prev: "schedule" },
            })
          }
        >
          <AddIcon size={45} color={COLORS.maroon} />
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {courses.map((course) =>
          course.classes.map((classItem, index) => (
            <ClassInfoCard
              key={`${course.name}-${index}`}
              courseName={course.name}
              classInfo={{
                type: classItem.type,
                section: classItem.section,
                day: classItem.day,
                startTime: classItem.startTime,
                endTime: classItem.endTime,
                buildingCode: classItem.buildingCode ?? "",
                room: classItem.room ?? "",
              }}
              onDelete={() => {}}
            />
          )),
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  content: {
    padding: 20,
    gap: 8,
  },
});
