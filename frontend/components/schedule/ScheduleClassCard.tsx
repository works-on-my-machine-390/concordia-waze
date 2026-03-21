import { StyleSheet, Text, View } from "react-native";
import type { NormalizedScheduleClass } from "../../app/utils/schedule/types";

type Props = {
  courseName: string;
  classInfo: NormalizedScheduleClass;
  backgroundColor: string;
  textColor: string;
};

export default function ScheduleClassCard({
  courseName,
  classInfo,
  backgroundColor,
  textColor,
}: Readonly<Props>) {
  const formattedSection = classInfo.section
    ? classInfo.section.replaceAll(/-/g, " ").toUpperCase()
    : "";

  const formattedLocation = [classInfo.buildingCode, classInfo.room]
    .filter(Boolean)
    .map((value) => value.toUpperCase())
    .join(" ");

  return (
    <View style={[styles.card, { backgroundColor }]}>
      <View style={styles.content}>
        <View style={styles.top}>
          <Text style={[styles.name, { color: textColor }]}>
            {courseName.toUpperCase()}
            {formattedSection ? ` - ${formattedSection}` : ""}
          </Text>

          <Text style={[styles.type, { color: textColor }]}>
            {classInfo.type}
          </Text>
        </View>

        <View style={styles.bottom}>
          <Text style={[styles.text, { color: textColor }]}>
            {classInfo.day} {classInfo.startTime} - {classInfo.endTime}
          </Text>

          <Text style={[styles.text, { color: textColor }]}>
            {formattedLocation}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 10,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
  },
  content: {
    gap: 4,
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottom: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  name: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 8,
  },
  type: {
    fontSize: 13,
    fontWeight: "600",
  },
  text: {
    fontSize: 13,
  },
});