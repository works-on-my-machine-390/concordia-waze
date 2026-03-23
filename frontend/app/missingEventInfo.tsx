import MissingEventInfoForm, {
    type MissingInfoEntry,
  } from "../components/schedule/MissingEventInfoForm";
  import { useRouter } from "expo-router";
  import { Linking, StyleSheet, Text, TouchableOpacity, View } from "react-native";
  import { SafeAreaView } from "react-native-safe-area-context";
  import {
    useCourses,
    type ClassItem,
    type CourseItem,
  } from "../hooks/queries/googleCalendarQueries";
  import { COLORS } from "./constants";
  
  const EXTENSION_URL =
    "https://chromewebstore.google.com/detail/visual-schedule-builder-e/nbapggbchldhdjckbhdhkhlodokjdoha";
  
  const isValidBuildingCode = (code?: string) => (code?.trim().length ?? 0) >= 2;

  const isMissingInfo = (item: ClassItem): boolean =>
    !isValidBuildingCode(item.buildingCode) ||
    !item.room?.trim() ||
    !item.startTime?.trim() ||
    !item.endTime?.trim();
  
  const collectMissingEntries = (courses: CourseItem[]): MissingInfoEntry[] =>
    courses.flatMap((course) =>
      course.classes
        .filter((c) => c.origin === "google" && isMissingInfo(c))
        .map((classItem) => ({ courseName: course.name, classItem })),
    );
  
  export default function MissingEventInfoScreen() {
    const router = useRouter();
    const { data: syncedCourses = [] } = useCourses();
    const missingEntries = collectMissingEntries(syncedCourses);
    const goToSchedule = () => router.replace("/(drawer)/schedule");
  
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Missing Info</Text>
          <Text style={styles.subtitle}>
            Some synced classes are missing details. Fill them in or continue.
          </Text>
        </View>
  
        <View style={styles.formContainer}>
          <MissingEventInfoForm
            missingEntries={missingEntries}
            onAllResolved={goToSchedule}
          />
        </View>
  
        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={goToSchedule}
            testID="skip-all-button"
          >
            <Text style={styles.skipText}>
              {missingEntries.length === 0 ? "Done" : "Skip All"}
            </Text>
          </TouchableOpacity>
  
          <TouchableOpacity
            style={styles.promoCard}
            onPress={() => Linking.openURL(EXTENSION_URL)}
            testID="extension-promo-button"
          >
            <View style={styles.promoContent}>
              <Text style={styles.promoLabel}>TIP</Text>
              <View style={styles.promoTextGroup}>
                <Text style={styles.promoTitle}>Visual Schedule Builder Export</Text>
                <Text style={styles.promoSubtitle}>
                  Build your schedule on Concordia's site and export it directly to Google Calendar.
                </Text>
              </View>
            </View>
            <Text style={styles.promoLink}>Get extension →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    header: {
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#EFEFEF",
    },
    title: {
      fontSize: 26,
      fontWeight: "800",
      color: COLORS.textPrimary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 13,
      color: "#888",
      lineHeight: 18,
    },
    formContainer: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: 24,
      paddingVertical: 16,
      borderTopWidth: 1,
      borderTopColor: "#EFEFEF",
      gap: 12,
    },
    skipBtn: {
      backgroundColor: COLORS.maroon,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: "center",
    },
    skipText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "700",
    },
    promoCard: {
      borderWidth: 1.5,
      borderColor: "#E5E5E5",
      borderRadius: 12,
      padding: 14,
      gap: 8,
      backgroundColor: "#FAFAFA",
    },
    promoContent: {
      flexDirection: "row",
      gap: 10,
      alignItems: "flex-start",
    },
    promoLabel: {
      fontSize: 10,
      fontWeight: "800",
      color: COLORS.maroon,
      letterSpacing: 1,
      marginTop: 2,
    },
    promoTextGroup: {
      flex: 1,
      gap: 3,
    },
    promoTitle: {
      fontSize: 13,
      fontWeight: "700",
      color: COLORS.textPrimary,
    },
    promoSubtitle: {
      fontSize: 12,
      color: "#888",
      lineHeight: 17,
    },
    promoLink: {
      fontSize: 12,
      fontWeight: "700",
      color: COLORS.maroon,
      textAlign: "right",
    },
  });