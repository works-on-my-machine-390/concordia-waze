import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../app/constants";
import { validateTime, validateTimeRange } from "../../app/utils/classValidationUtils";
import { type BuildingListItem, useGetAllBuildings } from "../../hooks/queries/buildingQueries";
import { type ClassItem, useUpdateClassItem } from "../../hooks/queries/googleCalendarQueries";

export type MissingInfoEntry = {
  courseName: string;
  classItem: ClassItem & { itemId?: string };
};

type Props = {
  missingEntries: MissingInfoEntry[];
  onAllResolved?: () => void;
};

type ModalState =
  | { type: "location" | "time"; entry: MissingInfoEntry }
  | null;

const isMissingLocation = (item: ClassItem) => !item.buildingCode?.trim() || !item.room?.trim();
const isMissingTime = (item: ClassItem) => !item.startTime?.trim() || !item.endTime?.trim();
const getClassID = (item: MissingInfoEntry["classItem"]) => item.itemId ?? item.classId ?? item.eventId;
const entryKey = (entry: MissingInfoEntry, i: number) => `${entry.courseName}-${getClassID(entry.classItem) ?? i}`;

function ModalSheet({
  title,
  subtitle,
  error,
  isPending,
  onSave,
  onClose,
  children,
}: Readonly<{
  title: string;
  subtitle: string;
  error: string | null;
  isPending: boolean;
  onSave: () => void;
  onClose: () => void;
  children: React.ReactNode;
}>) {
  return (
    <Modal transparent animationType="slide" onRequestClose={onClose}>
      <View style={ms.overlay}>
        <ScrollView contentContainerStyle={ms.sheetScroll} keyboardShouldPersistTaps="handled">
          <View style={ms.sheet}>
            <Text style={ms.title}>{title}</Text>
            <Text style={ms.subtitle}>{subtitle}</Text>
            {children}
            {!!error && <Text style={ms.error}>{error}</Text>}
            <View style={ms.actions}>
              <TouchableOpacity style={ms.cancelBtn} onPress={onClose}>
                <Text style={ms.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[ms.saveBtn, isPending && ms.saveBtnDisabled]}
                onPress={onSave}
                disabled={isPending}
              >
                <Text style={ms.saveText}>{isPending ? "Saving…" : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function FieldLabel({ label }: Readonly<{ label: string }>) {
  return <Text style={ms.label}>{label}</Text>;
}

function LocationModal({ entry, onClose }: Readonly<{ entry: MissingInfoEntry; onClose: () => void }>) {
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingListItem | null>(null);
  const [room, setRoom] = useState("");
  const [showList, setShowList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data, isLoading } = useGetAllBuildings();
  const { mutate, isPending } = useUpdateClassItem(entry.courseName);

  const buildings = [...(data?.buildings.SGW ?? []), ...(data?.buildings.LOY ?? [])];
  const isActive = (code: string) => selectedBuilding?.code === code;

  const handleSave = () => {
    if (!selectedBuilding) return setError("Please select a building.");
    if (!room.trim()) return setError("Please enter a room number.");
    const classID = getClassID(entry.classItem);
    if (!classID) return setError("Cannot update: missing class ID.");
    mutate(
      { classID, classItem: { buildingCode: selectedBuilding.code, room: room.trim() } },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalSheet
      title="Add Location"
      subtitle={`${entry.courseName} · ${entry.classItem.type}`}
      error={error}
      isPending={isPending}
      onSave={handleSave}
      onClose={onClose}
    >
      <FieldLabel label="Building" />
      {isLoading ? (
        <ActivityIndicator color={COLORS.maroon} style={{ marginVertical: 12 }} />
      ) : (
        <>
          <TouchableOpacity style={ms.dropdown} onPress={() => setShowList((v) => !v)}>
            {selectedBuilding ? (
              <View style={ms.selectedRow}>
                <View style={ms.codeBadge}>
                  <Text style={ms.codeBadgeText}>{selectedBuilding.code}</Text>
                </View>
                <Text style={ms.dropdownValue} numberOfLines={1}>{selectedBuilding.long_name}</Text>
              </View>
            ) : (
              <Text style={ms.dropdownPlaceholder}>Select a building…</Text>
            )}
            <Text style={ms.chevron}>{showList ? "▲" : "▼"}</Text>
          </TouchableOpacity>

          {showList && (
            <View style={ms.listContainer}>
              <ScrollView style={ms.list} nestedScrollEnabled>
                {buildings.map((b) => (
                  <TouchableOpacity
                    key={b.code}
                    style={[ms.listItem, isActive(b.code) && ms.listItemActive]}
                    onPress={() => { setSelectedBuilding(b); setShowList(false); }}
                  >
                    <View style={ms.buildingRow}>
                      <View style={[ms.codeBadge, isActive(b.code) && ms.codeBadgeActive]}>
                        <Text style={[ms.codeBadgeText, isActive(b.code) && ms.codeBadgeTextActive]}>
                          {b.code}
                        </Text>
                      </View>
                      <View style={ms.buildingTextGroup}>
                        <Text style={[ms.buildingLongName, isActive(b.code) && ms.listItemTextActive]}>
                          {b.long_name}
                        </Text>
                        <Text style={ms.buildingAddress} numberOfLines={1}>{b.address}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </>
      )}

      <FieldLabel label="Room" />
      <TextInput
        style={ms.input}
        placeholder="e.g. 110"
        placeholderTextColor="#bbb"
        value={room}
        onChangeText={setRoom}
      />
    </ModalSheet>
  );
}


function TimeModal({ entry, onClose }: Readonly<{ entry: MissingInfoEntry; onClose: () => void }>) {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useUpdateClassItem(entry.courseName);

  const handleSave = () => {
    const err = validateTime(startTime) ?? validateTime(endTime) ?? validateTimeRange(startTime, endTime);
    if (err) return setError(err);
    const classID = getClassID(entry.classItem);
    if (!classID) return setError("Cannot update: missing class ID.");
    mutate(
      { classID, classItem: { startTime: startTime.trim(), endTime: endTime.trim() } },
      { onSuccess: onClose },
    );
  };

  return (
    <ModalSheet
      title="Add Time"
      subtitle={`${entry.courseName} · ${entry.classItem.type} · ${entry.classItem.day}`}
      error={error}
      isPending={isPending}
      onSave={handleSave}
      onClose={onClose}
    >
      {(["Start Time", "End Time"] as const).map((label, i) => (
        <View key={label}>
          <FieldLabel label={label} />
          <TextInput
            style={ms.input}
            placeholder={i === 0 ? "e.g. 09:00" : "e.g. 10:30"}
            placeholderTextColor="#bbb"
            value={i === 0 ? startTime : endTime}
            onChangeText={i === 0 ? setStartTime : setEndTime}
          />
        </View>
      ))}
    </ModalSheet>
  );
}


function MissingCard({
  entry,
  index,
  onDismiss,
  onOpenModal,
}: Readonly<{
  entry: MissingInfoEntry;
  index: number;
  onDismiss: (key: string) => void;
  onOpenModal: (state: NonNullable<ModalState>) => void;
}>) {
  const { courseName, classItem } = entry;
  const key = entryKey(entry, index);
  const missingLocation = isMissingLocation(classItem);
  const missingTime = isMissingTime(classItem);
  const timeLabel = classItem.startTime?.trim()
    ? `${classItem.startTime} - ${classItem.endTime}`
    : "No Time";

  const getBadgeLabel = () => {
    if (missingLocation && missingTime) return "No Location · No Time";
    if (missingLocation) return "No Location";
    return "No Time";
  };

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.cardCourse}>{courseName}</Text>
          <Text style={s.cardMeta}>{classItem.day || "No Day"}{"  "}{timeLabel}</Text>
        </View>
        <View style={s.missingBadge}>
          <Text style={s.missingBadgeText}>{getBadgeLabel()}</Text>
        </View>
      </View>

      <View style={s.cardActions}>
        {missingLocation && (
          <TouchableOpacity style={s.addBtn} onPress={() => onOpenModal({ type: "location", entry })} testID={`add-location-${key}`}>
            <Text style={s.addBtnText}>+ Location</Text>
          </TouchableOpacity>
        )}
        {missingTime && (
          <TouchableOpacity style={s.addBtn} onPress={() => onOpenModal({ type: "time", entry })} testID={`add-time-${key}`}>
            <Text style={s.addBtnText}>+ Time</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.continueBtn} onPress={() => onDismiss(key)} testID={`continue-${key}`}>
          <Text style={s.continueBtnText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}


export default function MissingEventInfoForm({ missingEntries, onAllResolved }: Readonly<Props>) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [activeModal, setActiveModal] = useState<ModalState>(null);

  const dismiss = (key: string) => {
    const next = new Set([...dismissed, key]);
    setDismissed(next);
    if (missingEntries.every((e, i) => next.has(entryKey(e, i)))) onAllResolved?.();
  };

  if (missingEntries.length === 0) {
    return (
      <View style={s.emptyContainer}>
        <Text style={s.emptyText}>All classes are complete!</Text>
      </View>
    );
  }

  return (
    <>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {missingEntries.map((entry, i) => {
          const key = entryKey(entry, i);
          return dismissed.has(key) ? null : (
            <MissingCard
              key={key}
              entry={entry}
              index={i}
              onDismiss={dismiss}
              onOpenModal={setActiveModal}
            />
          );
        })}
      </ScrollView>

      {activeModal?.type === "location" && (
        <LocationModal entry={activeModal.entry} onClose={() => setActiveModal(null)} />
      )}
      {activeModal?.type === "time" && (
        <TimeModal entry={activeModal.entry} onClose={() => setActiveModal(null)} />
      )}
    </>
  );
}


const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 12, gap: 12 },
  emptyContainer: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  emptyText: { fontSize: 15, color: "#888", fontWeight: "500" },
  card: {
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    backgroundColor: COLORS.maroon,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  cardHeaderLeft: { flex: 1, gap: 2 },
  cardCourse: { color: "#fff", fontSize: 14, fontWeight: "700" },
  cardMeta: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  missingBadge: { backgroundColor: "rgba(0,0,0,0.20)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  missingBadgeText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  cardActions: { flexDirection: "row", gap: 10, padding: 12, flexWrap: "wrap" },
  addBtn: { flex: 1, backgroundColor: COLORS.maroon, borderRadius: 8, paddingVertical: 11, alignItems: "center", minWidth: 100 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  continueBtn: { flex: 1, borderRadius: 8, borderWidth: 1.5, borderColor: COLORS.maroon, paddingVertical: 11, alignItems: "center", minWidth: 80 },
  continueBtnText: { color: COLORS.maroon, fontWeight: "700", fontSize: 13 },
});

const ms = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetScroll: { justifyContent: "flex-end", flexGrow: 1 },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 44,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  subtitle: { fontSize: 13, color: "#888", marginBottom: 4 },
  label: {
    fontSize: 11,
    fontWeight: "700",
    color: "#888",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 6,
    marginTop: 14,
  },
  input: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#1A1A2E",
  },
  dropdown: {
    backgroundColor: "#FAFAFA",
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dropdownPlaceholder: { fontSize: 15, color: "#bbb", flex: 1 },
  dropdownValue: { fontSize: 15, color: "#1A1A2E", flex: 1 },
  selectedRow: { flexDirection: "row", alignItems: "center", flex: 1, gap: 8 },
  chevron: { fontSize: 11, color: "#888", marginLeft: 8 },
  listContainer: {
    borderWidth: 1.5,
    borderColor: "#E5E5E5",
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    overflow: "hidden",
  },
  list: { backgroundColor: "#fff" },
  listItem: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  listItemActive: { backgroundColor: "#F4E8EE" },
  listItemTextActive: { color: COLORS.maroon, fontWeight: "700" },
  buildingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  buildingTextGroup: { flex: 1 },
  buildingLongName: { fontSize: 14, color: "#1A1A2E", fontWeight: "600" },
  buildingAddress: { fontSize: 11, color: "#999", marginTop: 1 },
  codeBadge: {
    backgroundColor: "#F0F0F0",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 3,
    minWidth: 32,
    alignItems: "center",
  },
  codeBadgeActive: { backgroundColor: COLORS.maroon },
  codeBadgeText: { fontSize: 11, fontWeight: "700", color: "#555" },
  codeBadgeTextActive: { color: "#fff" },
  error: { color: COLORS.error, fontSize: 13, fontWeight: "600", marginTop: 8 },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, color: "#888", fontWeight: "600" },
  saveBtn: {
    flex: 2,
    backgroundColor: COLORS.maroon,
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveText: { fontSize: 14, color: "#fff", fontWeight: "700" },
});