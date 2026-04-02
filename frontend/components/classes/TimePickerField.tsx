import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  inputStyle?: object;
};

function timeStringToDate(timeStr: string): Date {
  const date = new Date();
  const timeRegex = /^(\d{1,2}):(\d{2})$/;
  const match = timeRegex.exec(timeStr);

  if (match) {
    date.setHours(Number.parseInt(match[1], 10), Number.parseInt(match[2], 10), 0, 0);
    return date;
  }

  date.setHours(9, 0, 0, 0);
  return date;
}

function dateToTimeString(date: Date): string {
  const h = date.getHours().toString().padStart(2, "0");
  const m = date.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function TimePickerField({
  value,
  onChange,
  placeholder = "09:00",
  inputStyle,
}: Readonly<Props>) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(timeStringToDate(value));

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (selected) {
        onChange(dateToTimeString(selected));
      }
      return;
    }
    if (selected) {
      setTempDate(selected);
    }
  };

  const handleOpen = () => {
    setTempDate(timeStringToDate(value));
    setShowPicker(true);
  };

  const handleConfirm = () => {
    onChange(dateToTimeString(tempDate));
    setShowPicker(false);
  };

  const handleCancel = () => {
    setShowPicker(false);
  };

  return (
    <View>
      <TouchableOpacity
        style={[styles.input, inputStyle]}
        onPress={handleOpen}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.timeText : styles.placeholder}>
          {value || placeholder}
        </Text>
      </TouchableOpacity>

      {Platform.OS === "android" && showPicker && (
        <DateTimePicker
          value={tempDate}
          mode="time"
          is24Hour
          display="spinner"
          onChange={handleChange}
        />
      )}

      {Platform.OS === "ios" && (
        <Modal visible={showPicker} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={handleCancel}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirm}>
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={tempDate}
                mode="time"
                is24Hour
                display="spinner"
                onChange={handleChange}
                themeVariant="light"
                style={styles.picker}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    backgroundColor: "#fff",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
  },
  timeText: {
    fontSize: 14,
    color: "#1A1A2E",
  },
  placeholder: {
    fontSize: 14,
    color: "#bbb",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  cancelText: {
    fontSize: 16,
    color: "#888",
  },
  doneText: {
    fontSize: 16,
    color: "#912338",
    fontWeight: "700",
  },
  picker: {
    height: 200,
    marginLeft: 40,
  },
});