import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import ScheduleListView from "@/components/schedule/ScheduleListView";
import WeeklyScheduleView from "@/components/schedule/WeeklyScheduleView";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGuestCourses } from "../../hooks/guestStorage";
import { useCourses, type CourseItem } from "../../hooks/queries/googleCalendarQueries";
import { COLORS } from "../constants";
import { AddIcon } from "../icons";
import { normalizeScheduleCourses } from "../utils/schedule/normalizeScheduleCourses";

export default function Schedule() {
  const router = useRouter();
  const [guestCourses, setGuestCourses] = useState<CourseItem[]>([]);
  const { data: syncedCourses = [] } = useCourses();

  useFocusEffect(
    useCallback(() => {
      const loadGuestCourses = async () => {
        const storedCourses = await getGuestCourses();
        setGuestCourses(storedCourses);
      };

      loadGuestCourses();
    }, []),
  );

  const allCourses = useMemo(
    () => normalizeScheduleCourses([...guestCourses, ...syncedCourses]),
    [guestCourses, syncedCourses],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>

        <TouchableOpacity
          testID="add-class-button"
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

      <View style={styles.syncButtonContainer}>
        <SyncCalendarButton onPress={() => router.push("/googleCalendarSync")} />
      </View>

      <WeeklyScheduleView courses={allCourses} />
      <ScheduleListView courses={allCourses} />
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
  syncButtonContainer: {
    marginBottom: 16,
  },
});