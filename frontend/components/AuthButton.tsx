/*
Button component that displays a loading spinner when authentication is in progress
*/
import React from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from "react-native";
import theme, { colors } from "../app/styles/theme";

export default function AuthButton({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.button, disabled ? styles.buttonDisabled : null]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.text}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.maroon,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 16,
    width: "100%",
  },
  buttonDisabled: { opacity: 0.6 },
  text: { color: "#fff", fontWeight: "700" },
});