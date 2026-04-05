import { COLORS } from "@/app/constants";
import { LogoutIcon } from "@/app/icons";
import { SHADOW } from "@/app/styles/theme";
import { Point } from "@/hooks/queries/buildingQueries";
import { useRouter } from "expo-router";
import { StyleSheet, Text, TouchableOpacity } from "react-native";

type Props = {
  location?: Point;
};

export default function ReturnOutdoorButton(props: Readonly<Props>) {
  const router = useRouter();
  const handlePress = () => {

    // note, camLat/camLng doesn't do anything right now as the map recenter useEffect relies on campus param being defined
    // which isn't great design, but this can be fixed someday. (perhaps a more intentional param to trigger recenter)
    router.push({
      pathname: "/map",
      params: {
        camLat: props.location?.latitude, 
        camLng: props.location?.longitude,
      },
    });
  };

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>View outdoor map</Text>
                <LogoutIcon size={24} color={COLORS.surface} />

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
