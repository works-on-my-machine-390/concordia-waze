import { COLORS } from "@/app/constants";
import {
  BathroomIcon,
  CirculationDeskIcon,
  ElevatorIcon,
  FireEscapeIcon,
  LockersIcon,
  ReferenceDeskIcon,
  SecurityIcon,
  SittingAreaIcon,
  SlopeUpIcon,
  StairsIcon,
  StudySpotIcon,
} from "@/app/icons";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";

type PoiFilter = {
  label: string;
  type: string;
  Icon: React.ComponentType<{ size?: number; color?: string }>;
};

type Props = {
  onFilterPress: (type: string, label: string) => void;
};

export default function IndoorPoiFilters({ onFilterPress }: Readonly<Props>) {
  const filters: PoiFilter[] = [
    { label: "Bathrooms", type: "bathroom", Icon: BathroomIcon },
    { label: "Stairs", type: "stairs", Icon: StairsIcon },
    { label: "Elevators", type: "elevator", Icon: ElevatorIcon },
    { label: "Study Spots", type: "study_spot", Icon: StudySpotIcon },
    { label: "Sitting Areas", type: "sitting_area", Icon: SittingAreaIcon },
    { label: "Lockers", type: "lockers", Icon: LockersIcon },
    { label: "Ramps", type: "ramp", Icon: SlopeUpIcon },
    { label: "Fire Escapes", type: "fire_escape", Icon: FireEscapeIcon },
    { label: "Security", type: "campus_security", Icon: SecurityIcon },
    {
      label: "Circulation Desk",
      type: "circulation_desk",
      Icon: CirculationDeskIcon,
    },
    {
      label: "Reference Desk",
      type: "reference_desk",
      Icon: ReferenceDeskIcon,
    },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scrollView}
      contentContainerStyle={styles.contentContainer}
    >
      {filters.map((filter) => (
        <Pressable
          key={filter.type}
          style={styles.chip}
          onPress={() => onFilterPress(filter.type, filter.label)}
        >
          <filter.Icon size={16} color={COLORS.textPrimary} />
          <Text style={styles.chipText}>{filter.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    marginTop: 12,
    paddingHorizontal: 12,
    flexGrow: 0,
  },
  contentContainer: {
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.bgDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    marginRight: 8,
    gap: 8,
  },
  chipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
  },
});
