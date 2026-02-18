import Entypo from "@expo/vector-icons/Entypo";
import { TouchableOpacity, View } from "react-native";
import { MapButtonStyles } from "./LocationButton";
export default function MapSettingsButton({
  onPress,
  bottomPositionPercentage = 15,
}: Readonly<{
  onPress: () => void;
  bottomPositionPercentage?: number;
}>) {
  return (
    <View
      style={[
        MapButtonStyles.wrapper,
        { bottom: `${bottomPositionPercentage}%` },
      ]}
    >
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Open map settings"
        onPress={onPress}
        style={MapButtonStyles.button}
        activeOpacity={0.8}
      >
        <Entypo name="dots-three-vertical" size={24} color="#1f2937" />
      </TouchableOpacity>
    </View>
  );
}
