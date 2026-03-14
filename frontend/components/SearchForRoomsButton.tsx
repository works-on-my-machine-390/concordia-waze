import { COLORS } from "@/app/constants";
import { Pressable, StyleSheet, Text, View } from "react-native";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";

type Props = {
  onPress?: () => void;
};
export default function SearchForRoomsButton(props: Readonly<Props>) {
  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    }
  };

  return (
    <View style={{ margin: 16 }}>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text>Looking for rooms?</Text>
        <FontAwesome6 name="door-open" size={24} color={COLORS.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.bgDark,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
