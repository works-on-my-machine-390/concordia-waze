import { COLORS } from "@/app/constants";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  label?: string;
  icon?: React.ReactNode;
  onPress?: () => void;
};
export default function SearchForTypeButton(props: Readonly<Props>) {
  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    }
  };

  return (
    <View style={{ margin: 16 }}>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text>{props.label}</Text>
        {props.icon}
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
