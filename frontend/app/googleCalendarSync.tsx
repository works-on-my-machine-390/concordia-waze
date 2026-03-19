import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Bar as ProgressBar } from "react-native-progress";
import { useRouter } from "expo-router";
import { COLORS } from "../app/constants";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { syncCourses } from "../hooks/queries/googleCalendarQueries";

const COURSE_QUERY_KEY = ["courses"] as const;
const ProgressBarComponent = ProgressBar as unknown as React.ComponentType<any>;

export default function GoogleSyncPage() {
  const [progress, setProgress] = useState(0);
  const queryClient = useQueryClient();
  const router = useRouter();

  const syncMutation = useMutation({
    mutationFn: syncCourses,
    onSuccess: () => {
      setProgress(1);
      queryClient.invalidateQueries({ queryKey: COURSE_QUERY_KEY });
    },
  });

  useEffect(() => {
    if (!syncMutation.isPending && !syncMutation.isSuccess) {
      syncMutation.mutate(undefined);
    }
  }, [syncMutation]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (syncMutation.isPending) {
      interval = setInterval(() => {
        setProgress((prev) => (prev < 0.9 ? prev + 0.02 : prev));
      }, 200);
    } else if (syncMutation.isSuccess) {
      setProgress(1);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [syncMutation.isPending, syncMutation.isSuccess]);

  useEffect(() => {
    if (syncMutation.isSuccess) {
      const timer = setTimeout(() => {
        router.push("/(drawer)/schedule");
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [syncMutation.isSuccess, router]);

  const cancelSync = () => {
    setProgress(0);
    syncMutation.reset();
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Schedule</Text>

      <Text style={styles.syncText}>
        {syncMutation.isSuccess ? "Sync Complete!" : "Syncing Google Calendar"}
      </Text>

      <ProgressBarComponent
        progress={progress}
        width={300}
        height={20}
        color={COLORS.maroon}
        style={styles.progress}
      />

      <TouchableOpacity style={styles.cancelButton} onPress={cancelSync}>
        <Text style={styles.cancelText}>Cancel Sync</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    paddingTop: 60,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 40,
  },
  syncText: {
    fontSize: 16,
    marginBottom: 20,
  },
  progress: {
    marginBottom: 40,
  },
  cancelButton: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 10,
    paddingHorizontal: 40,
    borderRadius: 6,
  },
  cancelText: {
    color: "white",
    fontWeight: "600",
  },
});
