import { useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import {
  getGoogleAuthStatus,
  isAuthRequired,
} from "@/hooks/queries/googleCalendarQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { AddIcon } from "../icons";
import { COLORS } from "../constants";

export default function Schedule() {
  const router = useRouter();
  const { data: userProfile, refetch: refetchProfile } = useGetProfile();

  const handleSyncCalendarPress = async () => {
    let userId = userProfile?.id;
    if (!userId) {
      const profileResult = await refetchProfile();
      userId = profileResult.data?.id;
    }

    const status = await getGoogleAuthStatus(userId);
    if (!status) {
      return;
    }

    if (!isAuthRequired(status)) {
      router.push("/googleCalendarSync");
      return;
    }

    await WebBrowser.openAuthSessionAsync(status.url);

    // Re-check auth after the OAuth session closes/returns.
    const afterAuthStatus = await getGoogleAuthStatus(userId);
    if (afterAuthStatus && !isAuthRequired(afterAuthStatus)) {
      router.push("/googleCalendarSync");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Schedule</Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/add-class", params: { prev: "schedule" } })}
        >
          <AddIcon size={45} color={COLORS.maroon} />
        </TouchableOpacity>
      </View>
      <SyncCalendarButton onPress={handleSyncCalendarPress} />
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
});