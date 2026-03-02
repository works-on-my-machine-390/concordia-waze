import { colors, SHADOW } from "@/app/styles/theme";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, TextInput } from "react-native";

type Props = {
  value: string;
  placeholder: string;
  onPress: () => void;
  onClear: () => void;
};

export default function SearchPill({
  value,
  placeholder,
  onPress,
  onClear,
}: Readonly<Props>) {
  return (
    <Pressable style={styles.searchPill} onPress={onPress}>
      <Ionicons name="search" size={26} color={colors.maroon} />
      <TextInput
        value={value}
        placeholder={placeholder}
        placeholderTextColor="#818181"
        style={styles.searchInput}
        pointerEvents="none"
        editable={false}
      />
      {value.length > 0 && (
        <Pressable onPress={onClear}>
          <Ionicons name="close-circle" size={20} color="#818181" />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    backgroundColor: "white",
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    ...SHADOW,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111",
    paddingVertical: 0,
  },
});
