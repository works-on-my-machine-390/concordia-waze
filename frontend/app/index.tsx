/*
Home Page displaying the Concordia Waze logo, app name, tagline, and two buttons: 
    "Sign Up / Log in" navigates users to log in page 
    "Use without account" offers guest access (not available yet)
*/

import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useRouter } from "expo-router";
import { APP_INFO, COLORS, LOGO_IMAGE } from "./constants";

const LOGO_SIZE_HOME = 96;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.card}>
        <Image
          source={LOGO_IMAGE}
          style={styles.logo}
        />
        <Text style={styles.title}>{APP_INFO.name}</Text>
        <Text style={styles.subtitle}>{APP_INFO.tagline}</Text>

        <TouchableOpacity
          onPress={() => router.push("/login")}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Sign Up / Log in</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => console.log("Use without account")}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>Use without account</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    paddingTop: 40,
  },
  card: {
    width: 620,
    maxWidth: "90%",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 6,
  },
  logo: {
    width: LOGO_SIZE_HOME,
    height: LOGO_SIZE_HOME,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    marginTop: 6,
    marginBottom: 20,
    textAlign: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  primaryButtonText: {
    color: COLORS.surface,
    fontWeight: "700",
  },
  secondaryButton: {
    marginTop: 12,
    borderColor: COLORS.gold,
    borderWidth: 2,
    paddingVertical: 12,
    width: "100%",
    borderRadius: 8,
    alignItems: "center",
    backgroundColor: COLORS.surface,
  },
  secondaryButtonText: {
    color: "#7f6a53",
    fontWeight: "700",
  },
});