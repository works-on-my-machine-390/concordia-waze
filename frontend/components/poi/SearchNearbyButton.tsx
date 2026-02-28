import { COLORS } from "@/app/constants";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  query: string;
  onPress?: () => void;
};
export default function SearchNearbyButton(props: Readonly<Props>) {
  const query = props.query.trim();

  const handlePress = () => {
    if (props.onPress) {
      props.onPress();
    }
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <Pressable style={styles.button} onPress={handlePress}>
        <Text>Search nearby for "{query}"</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    borderColor: COLORS.textSecondary,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderStyle: "dashed",
  },
});
