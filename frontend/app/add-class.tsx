import BackHeader from "@/components/BackHeader";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
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
import { validateCourseName } from "../app/utils/classValidationUtils";
import { buildCourseItem } from "../app/utils/courseUtils";
import AddClassInfoForm, {
  ClassInfoFormData,
} from "../components/classes/AddClassInfoForm";
import ClassInfoCard from "../components/classes/ClassInfoCard";
import { ClassItem, CourseItem } from "../hooks/firebase/useFirestore";
import { addGuestCourse, getGuestCourses } from "../hooks/guestStorage";
import { COLORS } from "./constants";

export default function AddClassScreen() {
  const [courseName, setCourseName] = useState("");
  const [classInfo, setClassInfo] = useState<ClassInfoFormData[]>([]);
  const [showClassInfoForm, setShowClassInfoForm] = useState(false);
  const [courseNameError, setCourseNameError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [storedClasses, setStoredClasses] = useState<ClassItem[]>([]);

  const addCourseNameToClasses = (course: CourseItem) =>
    course.classes.map((c) => ({ ...c, courseName: course.name }));

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        const courses = await getGuestCourses();
        const classes = courses.flatMap(addCourseNameToClasses);
        setStoredClasses(classes);
      };
      load();
    }, []),
  );

  const handleAddCourseInfo = (data: ClassInfoFormData) => {
    setClassInfo((prev) => [...prev, data]);
    setShowClassInfoForm(false);
  };

  const handleShowClassInfoForm = () => {
    const error = validateCourseName(courseName);
    if (error) {
      setCourseNameError(error);
      return;
    }
    setCourseNameError(null);
    setShowClassInfoForm(true);
  };

  const handleDeleteSession = (index: number) => {
    setClassInfo((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    const error = validateCourseName(courseName);
    if (error) {
      setCourseNameError(error);
      return;
    }
    setCourseNameError(null);

    try {
      const course = buildCourseItem(courseName, classInfo);
      await addGuestCourse(course);
      router.push("/schedule");
    } catch {
      setSaveError("Saving failed. Please try again.");
    }
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
            style={[styles.input, !!courseNameError && styles.inputError]}
            placeholder="e.g. SOEN 384"
            placeholderTextColor="#bbb"
            value={courseName}
            onChangeText={(v) => {
              setCourseName(v);
              setCourseNameError(null);
            }}
            autoCapitalize="characters"
          />
          {!!courseNameError && (
            <Text style={styles.errorText}>{courseNameError}</Text>
          )}

          {classInfo.length > 0 && (
            <View style={styles.classInfoSummary}>
              {classInfo.map((s, index) => (
                <ClassInfoCard
                  key={`${s.type}-${s.day}-${s.startTime}`}
                  courseName={courseName}
                  classInfo={s}
                  onDelete={() => handleDeleteSession(index)}
                />
              ))}
            </View>
          )}

          {showClassInfoForm ? (
            <AddClassInfoForm
              onAdd={handleAddCourseInfo}
              onCancel={() => setShowClassInfoForm(false)}
              existingSessions={[...storedClasses, ...classInfo]}
            />
          ) : (
            <TouchableOpacity
              style={styles.addClassInfoBtn}
              onPress={handleShowClassInfoForm}
            >
              <Text style={styles.addClassInfoIcon}>+</Text>
              <Text style={styles.addClassInfoText}>
                Add a lecture, lab or tutorial for this course
              </Text>
            </TouchableOpacity>
          )}

          {!!saveError && <Text style={styles.errorText}>{saveError}</Text>}

          {classInfo.length > 0 && !showClassInfoForm && (
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
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
  inputError: {
    borderColor: COLORS.error,
    backgroundColor: "#e1c4c9",
  },
  errorText: {
    color: COLORS.error,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 4,
    marginBottom: 8,
  },
});
