import {
  BathroomIcon,
  ElevatorIcon,
  FireEscapeIcon,
  LockersIcon,
  StairsIcon,
  StudySpotIcon,
  SittingAreaIcon,
  SecurityIcon,
  SlopeUpIcon,
  CirculationDeskIcon,
  ReferenceDeskIcon,
  ExitIcon
} from "@/app/icons";
import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { Pressable, StyleSheet, View } from "react-native";
import { COLORS } from "../../app/constants";

type Props = {
  poi: PointOfInterest;
  width: number;
  height: number;
  onPress?: () => void;
  highlighted?: boolean;
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
      return FireEscapeIcon;
    case "study_spot":
      return StudySpotIcon;
    case "lockers":
      return LockersIcon;
    case "sitting_area":
      return SittingAreaIcon;
    case "campus_security":
      return SecurityIcon;
    case "ramp":
      return SlopeUpIcon;
    case "circulation_desk":
      return CirculationDeskIcon;
    case "reference_desk":
      return ReferenceDeskIcon;
    case "exit":
      return ExitIcon;
    default:
      return null;
  }
};

export default function PoiMarker({
  poi,
  width,
  height,
  onPress,
  highlighted
}: Readonly<Props>) {
  const IconComponent = getIconComponent(poi.type);
  if (!IconComponent) return null;

  const x = poi.position.x * width;
  const y = poi.position.y * height;

  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      style={[
        styles.marker,
        { left: x - ICON_SIZE / 2, top: y - ICON_SIZE / 2 },
      ]}
    >
      {highlighted ? <View style={styles.halo} /> : null}
      <IconComponent
        size={ICON_SIZE}
        color={highlighted ? COLORS.selectionBlue : COLORS.maroon}
      />
    </Pressable>
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
  halo: {
    position: "absolute",
    width: ICON_SIZE + 14,
    height: ICON_SIZE + 14,
    borderRadius: (ICON_SIZE + 14) / 2,
    backgroundColor: "rgba(30, 107, 255, 0.18)",
  },
});
