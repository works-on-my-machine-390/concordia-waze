import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import ScheduleListView from "@/components/schedule/ScheduleListView";
import WeeklyScheduleView from "@/components/schedule/WeeklyScheduleView";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import BottomSheet from "@gorhom/bottom-sheet";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getGuestCourses } from "../../hooks/guestStorage";
import {
  useCourses,
  type CourseItem,
} from "../../hooks/queries/googleCalendarQueries";
import { COLORS } from "../constants";
import { AddIcon, MenuIcon } from "../icons";
import { normalizeScheduleCourses } from "../utils/schedule/normalizeScheduleCourses";
import { useAuth } from "@/hooks/useAuth";

export default function Schedule() {
  const nav = useNavigation();
  const router = useRouter();
  const [guestCourses, setGuestCourses] = useState<CourseItem[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { checkToken } = useAuth();
  const { data: syncedCourses = [] } = useCourses();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ["20%", "45%", "80%"], []);

  useFocusEffect(
    useCallback(() => {
      const loadData = async () => {
        const loggedIn = await checkToken();
        setIsLoggedIn(loggedIn);

        if (!loggedIn) {
          const storedCourses = await getGuestCourses();
          setGuestCourses(storedCourses);
        }
      };
      loadData();
    }, [checkToken]),
  );

  const visibleCourses = useMemo(
    () => (isLoggedIn ? syncedCourses : guestCourses),
    [isLoggedIn, syncedCourses, guestCourses],
  );

  const allCourses = useMemo(
    () => normalizeScheduleCourses(visibleCourses),
    [visibleCourses],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <MenuIcon
          size={24}
          color={COLORS.maroon}
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          testID="schedule-menu-button"
        />
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

      <BottomSheet
        ref={bottomSheetRef}
        index={1}
        snapPoints={snapPoints}
        enablePanDownToClose={true}
      >
        <View style={styles.bottomSheetContent}>
          <ScheduleListView courses={allCourses} rawCourses={visibleCourses} />
        </View>
      </BottomSheet>
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
  bottomSheetContent: {
    flex: 1,
  },
});