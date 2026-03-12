import { useState } from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, DAYS, TYPES } from "../../app/constants";
import {
  validateClassInfoForm,
  validateNoTimeOverlap,
} from "../../app/utils/classValidationUtils";
import DaySelector from "./ClassInfoDaySelector";
import TypeSelector from "./ClassInfoTypeSelector";

export type ClassInfoFormData = {
  type: (typeof TYPES)[number];
  section: string;
  day: (typeof DAYS)[number];
  start_time: string;
  end_time: string;
  buildingCode: string;
  room: string;
};

type Props = {
  onAdd: (classInfo: ClassInfoFormData) => void;
  onCancel: () => void;
  existingSessions: ClassInfoFormData[];
};

export default function AddClassInfoForm({
  onAdd,
  onCancel,
  existingSessions,
}: Readonly<Props>) {
  const [type, setType] = useState<(typeof TYPES)[number] | null>(null);
  const [section, setSection] = useState("");
  const [day, setDay] = useState<(typeof DAYS)[number] | null>(null);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [buildingCode, setBuildingCode] = useState("");
  const [room, setRoom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    const error = validateClassInfoForm(
      type,
      section,
      day,
      startTime,
      endTime,
      buildingCode,
      room,
    );
    if (error) {
      setError(error);
      return;
    }

    const overlapError = validateNoTimeOverlap(
      { day: day, start_time: startTime, end_time: endTime },
      existingSessions,
    );
    if (overlapError) {
      setError(overlapError);
      return;
    }

    setError(null);
    onAdd({
      type,
      section,
      day,
      start_time: startTime,
      end_time: endTime,
      buildingCode,
      room,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Class Type</Text>
      <TypeSelector selected={type} onSelect={setType} />

      <Text style={styles.label}>Section</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. S JL"
        placeholderTextColor="#bbb"
        value={section}
        onChangeText={setSection}
      />

      <Text style={styles.label}>Day</Text>
      <DaySelector selected={day} onSelect={setDay} />

      <Text style={styles.label}>Time</Text>
      <View style={[styles.row, { gap: 8 }]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="09:00"
          placeholderTextColor="#bbb"
          value={startTime}
          onChangeText={setStartTime}
        />
        <Text style={styles.timeSep}>-</Text>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="10:30"
          placeholderTextColor="#bbb"
          value={endTime}
          onChangeText={setEndTime}
        />
      </View>

      <Text style={styles.label}>Location</Text>
      <View style={[styles.row, { gap: 10 }]}>
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Building (e.g. H)"
          placeholderTextColor="#bbb"
          value={buildingCode}
          onChangeText={setBuildingCode}
        />
        <TextInput
          style={[styles.input, { flex: 1.5 }]}
          placeholder="Room (e.g. 110)"
          placeholderTextColor="#bbb"
          value={room}
          onChangeText={setRoom}
        />
      </View>

      {!!error && <Text style={styles.errorText}>{error}</Text>}

      <View style={[styles.row, styles.actions]}>
        <TouchableOpacity
          style={[styles.btn, styles.cancelBtn]}
          onPress={onCancel}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.addBtn]}
          onPress={handleAdd}
        >
          <Text style={styles.addText}>Add Class</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderColor: "#DDD",
    borderWidth: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1A1A2E",
  },
  timeSep: {
    fontSize: 16,
    color: "#888",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 8,
    marginBottom: 4,
  },
  actions: {
    marginTop: 16,
  },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtn: {
    borderWidth: 1.5,
    borderColor: "#DDD",
  },
  cancelText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "600",
  },
  addBtn: {
    flex: 2,
    backgroundColor: COLORS.maroon,
  },
  addText: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "700",
  },
});
