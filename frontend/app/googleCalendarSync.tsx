// All placeholder code for now, will be replaced with actual syncing logic later on. 
// This is just to have an idea of the progress bar and cancel button UI.

import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import * as Progress from "react-native-progress";
import { MaterialIcons } from "@expo/vector-icons";
import { COLORS } from "../app/constants";

export default function GoogleSyncPage() {
  const [progress, setProgress] = useState(0);

  // Simulate syncing progress
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev < 1 ? prev + 0.01 : prev));
    }, 50); // updates every 50ms

    return () => clearInterval(interval);
  }, []);

  const cancelSync = () => {
    // Handle cancel logic
    setProgress(0);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.menuButton}>
        <MaterialIcons name="menu" size={24} color="black" />
      </TouchableOpacity>

      <Text style={styles.title}>Schedule</Text>

      <Text style={styles.syncText}>Syncing Google Calendar</Text>

      {/* Progress bar */}

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
  menuButton: {
    position: "absolute",
    top: 40,
    left: 20,
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