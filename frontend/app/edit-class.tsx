import BackHeader from "@/components/BackHeader";
import DeleteConfirmDialog from "@/components/schedule/DeleteConfirmDialog";
import { COLORS, TYPES } from "@/app/constants";
import {
  ClassItem,
  deleteClassItem,
  updateClassItem,
} from "@/hooks/queries/googleCalendarQueries";
import { deleteGuestClass, updateGuestClass } from "@/hooks/guestStorage";
import { useAuth } from "@/hooks/useAuth";
import {
  validateTime,
  validateTimeRange,
} from "@/app/utils/classValidationUtils";
import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import TimePickerField from "@/components/classes/TimePickerField";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const TYPE_TO_API: Record<string, string> = {
  Lecture: "lec",
  Lab: "lab",
  Tutorial: "tut",
};

function normalizeType(raw?: string) {
  const s = raw?.toLowerCase() ?? "";
  if (s === "lec" || s === "lecture") return "Lecture";
  if (s === "lab") return "Lab";
  if (s === "tut" || s === "tutorial") return "Tutorial";
  return "Lecture";
}

function Pill({
  options,
  selected,
  onSelect,
}: Readonly<{
  options: readonly string[];
  selected: string;
  onSelect: (v: string) => void;
}>) {
  return (
    <View style={s.row}>
      {options.map((o) => (
        <TouchableOpacity
          key={o}
          style={[s.pill, selected === o && s.pillOn]}
          onPress={() => onSelect(o)}
          activeOpacity={0.8}
        >
          <Text style={[s.pillTxt, selected === o && s.pillTxtOn]}>{o}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({ label }: Readonly<{ label: string }>) {
  return <Text style={s.label}>{label}</Text>;
}

export default function EditClassScreen() {
  const params = useLocalSearchParams<{
    courseName: string;
    classId: string;
    classIndex: string;
    type: string;
    section: string;
    day: string;
    startTime: string;
    endTime: string;
    buildingCode: string;
    room: string;
  }>();

  const { loggedIn: isLoggedIn } = useAuth();
  const queryClient = useQueryClient();

  const [type, setType] = useState(normalizeType(params.type));
  const [section, setSection] = useState(params.section ?? "");
  const [day, setDay] = useState(params.day ?? "MON");
  const [startTime, setStartTime] = useState(params.startTime ?? "");
  const [endTime, setEndTime] = useState(params.endTime ?? "");
  const [buildingCode, setBuildingCode] = useState(params.buildingCode ?? "");
  const [room, setRoom] = useState(params.room ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDelete, setShowDelete] = useState(false);

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["courses"] }),
      queryClient.invalidateQueries({ queryKey: ["nextClass"] }),
    ]);

  const handleSave = async () => {
    const err =
      validateTime(startTime) ??
      validateTime(endTime) ??
      validateTimeRange(startTime, endTime);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);

    const updates: Partial<ClassItem> = {
      type: TYPE_TO_API[type] ?? "lec",
      section,
      day,
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      buildingCode: buildingCode.trim(),
      room: room.trim(),
    };

    try {
      if (isLoggedIn) {
        await updateClassItem(params.courseName, params.classId, updates);
        await invalidate();
      } else {
        await updateGuestClass(
          params.courseName,
          Number(params.classIndex),
          updates as any,
        );
      }
      router.back();
    } catch (e: any) {
      setError(e?.message ?? "Saving failed. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setShowDelete(false);
    setDeleting(true);
    try {
      if (isLoggedIn) {
        await deleteClassItem(params.courseName, params.classId);
        await invalidate();
      } else {
        await deleteGuestClass(params.courseName, Number(params.classIndex));
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Could not delete class.");
    } finally {
      setDeleting(false);
    }
  };

  const busy = saving || deleting;

  return (
    <SafeAreaView style={s.safe}>
      <BackHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.container}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={s.title}>Edit Class</Text>

          <View style={s.courseTag}>
            <Text style={s.courseLabel}>COURSE</Text>
            <Text style={s.courseName}>{params.courseName}</Text>
          </View>

          <Field label="Type" />
          <Pill options={TYPES} selected={type} onSelect={setType} />

          <Field label="Section" />
          <TextInput
            style={s.input}
            value={section}
            onChangeText={setSection}
            placeholder="e.g. N"
            placeholderTextColor="#bbb"
            autoCapitalize="characters"
            testID="section-input"
          />

          <Field label="Day" />
          <Pill options={DAYS} selected={day} onSelect={setDay} />

          <Field label="Start Time" />
          <TimePickerField
            value={startTime}
            onChange={(v) => {
              setStartTime(v);
              setError(null);
            }}
            placeholder="09:00"
            inputStyle={s.timePickerInput}
          />

          <Field label="End Time" />
          <TimePickerField
            value={endTime}
            onChange={(v) => {
              setEndTime(v);
              setError(null);
            }}
            placeholder="10:30"
            inputStyle={s.timePickerInput}
          />

          <Field label="Building Code" />
          <TextInput
            style={s.input}
            value={buildingCode}
            onChangeText={setBuildingCode}
            placeholder="e.g. H"
            placeholderTextColor="#bbb"
            autoCapitalize="characters"
            testID="building-input"
          />

          <Field label="Room" />
          <TextInput
            style={s.input}
            value={room}
            onChangeText={setRoom}
            placeholder="e.g. 110"
            placeholderTextColor="#bbb"
            testID="room-input"
          />

          {!!error && <Text style={s.error}>{error}</Text>}

          <TouchableOpacity
            style={[s.btnSave, busy && s.dim]}
            onPress={handleSave}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={s.btnSaveTxt}>
              {saving ? "Saving…" : "Confirm & Save"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.btnDelete, busy && s.dim]}
            onPress={() => setShowDelete(true)}
            disabled={busy}
            activeOpacity={0.85}
          >
            <Text style={s.btnDeleteTxt}>
              {deleting ? "Deleting…" : "Delete Class"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <DeleteConfirmDialog
        visible={showDelete}
        courseName={params.courseName}
        isPending={deleting}
        onCancel={() => setShowDelete(false)}
        onDelete={handleDelete}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { padding: 20, paddingBottom: 48 },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  courseTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: COLORS.conuRedLight,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  courseLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.maroon,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  courseName: { fontSize: 15, fontWeight: "700", color: COLORS.maroon },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: "#bfb8b8",
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    color: COLORS.textPrimary,
  },
  timePickerInput: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: "#bfb8b8",
    backgroundColor: COLORS.surface,
    justifyContent: "center",
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: {
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: COLORS.surface,
  },
  pillOn: { backgroundColor: COLORS.maroon, borderColor: COLORS.maroon },
  pillTxt: { fontSize: 13, fontWeight: "600", color: COLORS.textPrimary },
  pillTxtOn: { color: "#fff" },
  btnSave: {
    backgroundColor: COLORS.maroon,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    marginTop: 28,
  },
  btnSaveTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
  btnDelete: {
    borderWidth: 1.8,
    borderColor: COLORS.maroon,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 12,
  },
  btnDeleteTxt: { color: COLORS.maroon, fontSize: 15, fontWeight: "600" },
  dim: { opacity: 0.55 },
  error: { color: COLORS.error, fontSize: 13, fontWeight: "700", marginTop: 8 },
});
