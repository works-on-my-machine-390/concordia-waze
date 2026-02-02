
import React from "react";
import { TextInput, View, Text, StyleSheet } from "react-native";
import theme, { colors } from "../app/styles/theme";

interface Props {
  label?: string | React.ReactNode;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  error?: string | null;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  accessibleLabel?: string;
  right?: React.ReactNode;
}

export default function AuthInput({
  label,
  placeholder,
  value,
  onChange,
  secureTextEntry,
  keyboardType,
  error,
  autoCapitalize = "none",
  accessibleLabel,
  right,
}: Props) {
  return (
    <View style={s.container}>
      {label ? <Text style={s.label}>{label}</Text> : null}
      <View style={s.row}>
        <TextInput
          accessibilityLabel={accessibleLabel ?? (typeof label === "string" ? label : "")}
          placeholder={placeholder}
          value={value}
          onChangeText={onChange}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          style={[s.input, error ? s.inputError : null, right ? { paddingRight: 40 } : null,]}
          autoCapitalize={autoCapitalize}
          placeholderTextColor="#999"
        />
        {right ? <View style={s.right}>{right}</View> : null}
      </View>
      {error ? <Text style={s.error}>{error}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  container: { marginBottom: 12 },
  label: { fontSize: 14, marginBottom: 6, color: colors.text, fontWeight: "600" },
  row: { flexDirection: "row", alignItems: "center" },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: colors.muted,
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: colors.text,
  },
  inputError: { borderColor: colors.inputError, backgroundColor: "#e1c4c9" },
  error: { color: colors.inputError, marginTop: 6 },
  right: {
    position: "absolute",
    right: 12,     
    top: "50%",   
    transform: [{ translateY: -12 }], // adjust if height changes
  },
});