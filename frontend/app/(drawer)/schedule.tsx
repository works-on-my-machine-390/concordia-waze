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
import { useCourses } from "../../hooks/queries/googleCalendarQueries";
import { COLORS } from "../constants";
import { AddIcon } from "../icons";
import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import ScheduleListView from "@/components/schedule/ScheduleListView";
import WeeklyScheduleView from "@/components/schedule/WeeklyScheduleView";

export default function Schedule() {
  const router = useRouter();
  const [guestCourses, setGuestCourses] = useState<CourseItem[]>([]);
  const { data: syncedCourses = [] } = useCourses();
  
  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const stored = await getGuestCourses();
        setGuestCourses(stored);
  
        console.log("GUEST COURSES:");
        console.log(JSON.stringify(stored, null, 2));
  
        console.log("SYNCED COURSES:");
        console.log(JSON.stringify(syncedCourses, null, 2));
      };
      load();
    }, [syncedCourses]),
  );

  const allCourses = [...guestCourses, ...syncedCourses];

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
      <View style={{ marginBottom: 16 }}>
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
  content: {
    padding: 20,
    gap: 8,
  },
});
