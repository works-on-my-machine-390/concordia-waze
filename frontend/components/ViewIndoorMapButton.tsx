import { COLORS } from "@/app/constants";
import { SHADOW } from "@/app/styles/theme";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  buildingCode: string;
};

export default function ViewIndoorMapButton({ buildingCode }: Readonly<Props>) {
  const router = useRouter();

  const handlePress = () => {
    router.push({
      pathname: "/indoor-map",
      params: { buildingCode },
    });
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>View indoor map</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: COLORS.maroon,
    ...SHADOW,
  },
  text: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
