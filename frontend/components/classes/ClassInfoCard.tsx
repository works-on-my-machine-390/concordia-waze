import { StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import { SessionFormData } from "./AddClassInfoForm";

type Props = {
  className: string;
  session: SessionFormData;
};

export default function ClassInfoCard({ className, session }: Readonly<Props>) {
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.name}>
          {className || "Class"} - {session.section}
        </Text>
        <Text style={styles.type}>{session.type}</Text>
      </View>
      <View style={styles.bottom}>
        <Text style={styles.text}>
          {session.day} {session.start_time} - {session.end_time}
        </Text>
        <Text style={styles.text}>
          {session.buildingCode} {session.room}
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
