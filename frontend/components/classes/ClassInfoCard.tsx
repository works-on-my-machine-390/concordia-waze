import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import { ClassInfoFormData } from "./AddClassInfoForm";

type Props = {
  courseName: string;
  classInfo: ClassInfoFormData;
};

export default function ClassInfoCard({ courseName, classInfo }: Readonly<Props>) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.name}>
          {courseName || "Course"} - {classInfo.section}
        </Text>
        <Text style={styles.type}>{classInfo.type}</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.text}>
          {classInfo.day} {classInfo.start_time} - {classInfo.end_time}
        </Text>
        <Text style={styles.text}>
          {classInfo.buildingCode} {classInfo.room}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#e0e0e0",
    borderRadius: 10,
    padding: 12,
    gap: 4,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
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
    color: COLORS.textPrimary,
  },
  type: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  text: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
});
