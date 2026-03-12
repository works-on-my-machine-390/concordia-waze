import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../app/constants";
import { ClassInfoFormData } from "./AddClassInfoForm";
import { DeleteIcon } from "../../app/icons"

type Props = {
  courseName: string;
  classInfo: ClassInfoFormData;
  onDelete: () => void;
};

export default function ClassInfoCard({
  courseName,
  classInfo,
  onDelete,
}: Readonly<Props>) {
  return (
<View style={styles.card}>
  <View style={styles.content}>
    <View style={styles.top}>
      <Text style={styles.name}>{courseName.toUpperCase()} - {classInfo.section.replace(/-/g, " ").toUpperCase()}</Text>
      <Text style={styles.type}>{classInfo.type}</Text>
    </View>
    <View style={styles.bottom}>
      <Text style={styles.text}>
        {classInfo.day}  {classInfo.start_time} - {classInfo.end_time}
      </Text>
      <Text style={styles.text}>
        {classInfo.buildingCode.toUpperCase()} {classInfo.room.toUpperCase()}
      </Text>
    </View>
  </View>
  <TouchableOpacity style={styles.deleteBtn} onPress={onDelete}>
    <DeleteIcon color={COLORS.error} size={20}/>
  </TouchableOpacity>
</View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E5E5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
  },
  content: {
    flex: 1,
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
    color: COLORS.textPrimary,
  },
  type: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  text: {
    fontSize: 13,
    color: "#555",
  },
  deleteBtn: {
    marginLeft: 20,
    alignSelf: "center",
  },
});