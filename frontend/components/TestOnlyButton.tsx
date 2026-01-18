import { Text, TouchableOpacity, StyleSheet, ViewStyle } from "react-native";

export type TestOnlyButtonProps = {
  onClick?: () => void;
  label?: string;
  disabled?: boolean;
};

/**
 * This button is used solely for testing purposes.
 * See TestOnlyButton-test.tsx for usage examples.
 */
export default function TestOnlyButton(props: TestOnlyButtonProps) {
  return (
    <TouchableOpacity
      onPress={props.onClick}
      disabled={props.disabled}
      style={[styles.button, props.disabled && styles.disabled]}
      testID="test-button"
    >
      <Text style={styles.text}>{props.label}</Text>
    </TouchableOpacity>
  );
}

export const TEST_BUTTON_DEFAULT_STYLES: ViewStyle = {
  backgroundColor: "#007AFF",
  padding: 12,
  borderRadius: 8,
  alignItems: "center",
  justifyContent: "center",
};
const styles = StyleSheet.create({
  button: TEST_BUTTON_DEFAULT_STYLES,
  disabled: {
    backgroundColor: "#CCCCCC",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
