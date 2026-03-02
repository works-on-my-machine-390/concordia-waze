import {
    BathroomIcon,
    ElevatorIcon,
    FireEscapeIcon,
    LockersIcon,
    StairsIcon,
    StudySpotIcon,
} from "@/app/icons";
import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { StyleSheet, View } from "react-native";

type Props = {
  poi: PointOfInterest;
  width: number;
  height: number;
};

const ICON_SIZE = 20;

const getIconComponent = (type: string) => {
  const normalizedType = type.toLowerCase().replace(/\s+/g, "_");

  switch (normalizedType) {
    case "stairs":
      return StairsIcon;
    case "bathroom":
      return BathroomIcon;
    case "elevator":
      return ElevatorIcon;
    case "fire_escape":
    case "fireescape":
      return FireEscapeIcon;
    case "study_spot":
      return StudySpotIcon;
    case "lockers":
      return LockersIcon;
    default:
      return null;
  }
};

export default function PoiMarker({ poi, width, height }: Props) {
  const IconComponent = getIconComponent(poi.type);

  if (!IconComponent) {
    return null;
  }

  const x = poi.position.x * width;
  const y = poi.position.y * height;

  return (
    <View
      style={[
        styles.marker,
        {
          left: x - ICON_SIZE / 2,
          top: y - ICON_SIZE / 2,
        },
      ]}
    >
      <IconComponent size={ICON_SIZE} color="#912338" />
    </View>
  );
}

const styles = StyleSheet.create({
  marker: {
    position: "absolute",
    width: ICON_SIZE,
    height: ICON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
});
