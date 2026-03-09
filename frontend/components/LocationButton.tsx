import { MapButtonStyles } from "@/app/styles/mapStyles";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { TouchableOpacity, View } from "react-native";

interface LocationButtonProps {
  onPress: () => void; // function to go to current location
  bottomPosition?: number; // optional prop to adjust bottom position of the button
}

export default function LocationButton({
  onPress,
  bottomPosition = 80,
}: Readonly<LocationButtonProps>) {
  return (
    <View style={[MapButtonStyles.wrapper, { bottom: bottomPosition }]}>
      {/* Adds fade (opacity) effect on press */}
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Go to my location"
        onPress={onPress}
        style={MapButtonStyles.button}
        activeOpacity={0.8}
      >
        {/* GPS crosshairs icon */}
        <MaterialCommunityIcons
          name="crosshairs-gps"
          size={30}
          color="#1f2937"
        />
      </TouchableOpacity>
    </View>
  );
}
