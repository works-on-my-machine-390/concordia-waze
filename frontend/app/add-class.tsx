import BackHeader from "@/components/BackHeader";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AddClassInfoForm, {
  ClassInfoFormData,
} from "../components/classes/AddClassInfoForm";
import ClassInfoCard from "../components/classes/ClassInfoCard";
import { COLORS } from "./constants";

export default function AddClassScreen() {
  const [courseName, setCourseName] = useState("");
  const [classInfo, setClassInfo] = useState<ClassInfoFormData[]>([]);
  const [showClassInfoForm, setShowClassInfoForm] = useState(false);

  const handleAddCourseInfo = (data: ClassInfoFormData) => {
    setClassInfo((prev) => [...prev, data]);
    setShowClassInfoForm(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <BackHeader />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Add a Course</Text>

          <Text style={styles.inputLabel}>Course Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. SOEN 384"
            placeholderTextColor="#bbb"
            value={courseName}
            onChangeText={setCourseName}
            autoCapitalize="characters"
          />

          {classInfo.length > 0 && (
            <View style={styles.classInfoSummary}>
              {classInfo.map((s) => (
                <ClassInfoCard
                  key={`${s.type}-${s.day}`}
                  courseName={courseName}
                  classInfo={s}
                />
              ))}
            </View>
          )}

          {showClassInfoForm ? (
            <AddClassInfoForm
              onAdd={handleAddCourseInfo}
              onCancel={() => setShowClassInfoForm(false)}
            />
          ) : (
            <TouchableOpacity
              style={styles.addClassInfoBtn}
              onPress={() => setShowClassInfoForm(true)}
            >
              <Text style={styles.addClassInfoIcon}>+</Text>
              <Text style={styles.addClassInfoText}>
                Add a lecture, lab or tutorial for this course
              </Text>
            </TouchableOpacity>
          )}

          {classInfo.length > 0 && !showClassInfoForm && (
            <TouchableOpacity style={styles.saveBtn}>
              <Text style={styles.saveText}>Save Class</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 6,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  input: {
    height: 48,
    borderRadius: 10,
    borderWidth: 1.8,
    borderColor: "#bfb8b8",
    paddingHorizontal: 12,
    backgroundColor: "#fff",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  classInfoSummary: {
    gap: 8,
    marginBottom: 12,
  },
  addClassInfoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderStyle: "dashed",
    marginBottom: 16,
  },
  addClassInfoIcon: {
    fontSize: 16,
    color: "#888",
  },
  addClassInfoText: {
    fontSize: 14,
    color: "#888",
    fontWeight: "500",
  },
  saveBtn: {
    backgroundColor: COLORS.maroon,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
  },
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
