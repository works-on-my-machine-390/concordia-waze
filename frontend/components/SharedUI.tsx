import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../app/constants";

// Reusable Password Show/Hide Toggle
export function PasswordToggle({ 
  show, 
  onToggle 
}: { 
  show: boolean; 
  onToggle: () => void;
}) {
  return (
    <TouchableOpacity onPress={onToggle}>
      <Text style={styles.toggleText}>
        {show ? "Hide" : "Show"}
      </Text>
    </TouchableOpacity>
  );
}

// Reusable Terms and Privacy Text
export function TermsText() {
  return (
    <View style={styles.termsContainer}>
      <Text style={styles.termsText}>
        By creating an account, you agree to our{" "}
        <Text style={styles.link}>Terms of Service</Text> and{" "}
        <Text style={styles.link}>Privacy Policy</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleText: {
    color: COLORS.maroon,
    fontWeight: "700",
    paddingHorizontal: 6,
  },
  termsContainer: {
    marginTop: 30,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  termsText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  link: {
    color: COLORS.maroon,
    fontWeight: "600",
  },
});