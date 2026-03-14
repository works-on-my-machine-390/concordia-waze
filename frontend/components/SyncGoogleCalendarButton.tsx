import { TouchableOpacity, Text, StyleSheet} from "react-native";
import { COLORS } from "../app/constants";

type Props = {
  onPress: () => void;
};

export default function SyncCalendarButton({ onPress }: Readonly<Props>) {
  return (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.text}>Sync Calendar</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: "flex-end",   
    marginRight: 16,
  },
  text: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "600",
  },
});