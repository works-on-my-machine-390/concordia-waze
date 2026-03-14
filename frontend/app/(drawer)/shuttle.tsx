import { DrawerActions, useNavigation } from "@react-navigation/native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetShuttleSchedule } from "../../hooks/queries/shuttleQueries";
import { COLORS } from "../constants";
import { MenuIcon } from "../icons";
import { endTaskTimer, startTaskTimer } from "@/lib/telemetry";

const C = COLORS,
  M = C.maroon;

const DAYS = [
  ["monday", "Mon", "Monday"],
  ["tuesday", "Tue", "Tuesday"],
  ["wednesday", "Wed", "Wednesday"],
  ["thursday", "Thu", "Thursday"],
  ["friday", "Fri", "Friday"],
] as const;

type Day = (typeof DAYS)[number][0];
type Row = { loy: string; sgw: string };

const zip = (a: string[], b: string[]): Row[] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({
    loy: a[i] ?? "—",
    sgw: b[i] ?? "—",
  }));

export default function ShuttleSchedule() {
  const nav = useNavigation();
  const [tab, setTab] = useState<Day>("monday");
  const { data, isLoading, error, refetch } = useGetShuttleSchedule();
  const timerActiveRef = useRef(false);
  const hasViewedScheduleRef = useRef(false);
  const latestTabRef = useRef<Day>(tab);
  const latestDepartureCountRef = useRef(0);

  const rows: Row[] = data?.[tab]
    ? zip(data[tab].LOY ?? [], data[tab].SGW ?? [])
    : [];

  useEffect(() => {
    latestTabRef.current = tab;
    latestDepartureCountRef.current = rows.length;
  }, [tab, rows.length]);

  useEffect(() => {
    if (!isLoading && !error && rows.length > 0) {
      hasViewedScheduleRef.current = true;
    }
  }, [isLoading, error, rows.length]);

  useEffect(() => {
    startTaskTimer("view_shuttle_schedule");
    timerActiveRef.current = true;

    return () => {
      if (!timerActiveRef.current) {
        return;
      }

      timerActiveRef.current = false;
      void endTaskTimer("view_shuttle_schedule", {
        success: hasViewedScheduleRef.current,
        selected_day: latestTabRef.current,
        departures_displayed: latestDepartureCountRef.current,
      });
    };
  }, []);

  let content: React.ReactNode;
  if (isLoading) {
    content = (
      <ActivityIndicator style={{ marginTop: 40 }} size="large" color={M} />
    );
  } else if (error) {
    content = (
      <View style={{ padding: 24, gap: 8 }}>
        <Text>Could not load schedule — {error.message}</Text>
        <TouchableOpacity onPress={() => refetch()}>
          <Text style={{ color: M }}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  } else {
    content = (
      <ScrollView
        contentContainerStyle={{ padding: 14, paddingBottom: 44 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
          }}
        >
          <Text>{DAYS.find((d) => d[0] === tab)?.[2]}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>
            {rows.length} departures
          </Text>
        </View>

        <View style={s.table}>
          <View style={s.thead}>
            {["#", "Loyola to SGW", "SGW to Loyola"].map((h) => (
              <Text key={h} style={[s.hTxt, h === "#" ? s.cN : s.cT]}>
                {h}
              </Text>
            ))}
          </View>
          {rows.map((r, i) => (
            <View
              key={`${tab}-${i}`}
              style={[
                s.row,
                i % 2 === 1 && { backgroundColor: C.background },
                i === rows.length - 1 && { borderBottomWidth: 0 },
              ]}
            >
              <Text style={[s.cN, { fontSize: 11, color: C.textMuted }]}>
                {i + 1}
              </Text>
              <Text style={[s.cT, s.time]}>{r.loy}</Text>
              <Text style={[s.cT, s.time]}>{r.sgw}</Text>
            </View>
          ))}
        </View>

        <View style={[s.card, { marginTop: 16, marginBottom: 12 }]}>
          <Text style={{ fontSize: 22, marginBottom: 4 }}>🪪</Text>
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: C.textPrimary,
              marginBottom: 3,
            }}
          >
            ID Required
          </Text>
          <Text
            style={{ fontSize: 11, color: C.textSecondary, lineHeight: 16 }}
          >
            Show your Concordia student or staff card.
          </Text>
        </View>

        <View
          style={[
            s.card,
            { backgroundColor: C.conuRedLight, borderColor: "#e8a0aa" },
          ]}
        >
          <Text
            style={{
              fontSize: 15,
              fontWeight: "700",
              color: M,
              marginBottom: 6,
            }}
          >
            Questions?
          </Text>
          <Text style={{ fontSize: 13, color: M, marginBottom: 2 }}>
            📧 shuttle@concordia.ca
          </Text>
          <Text style={{ fontSize: 13, color: M }}>
            📞 514-848-2424 ext. 4636
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.background }}>
      <View style={s.hdr}>
        <MenuIcon
          size={26}
          color={M}
          onPress={() => nav.dispatch(DrawerActions.openDrawer())}
          testID="menu-btn"
        />
        <Text style={s.title}>Shuttle Bus</Text>
      </View>

      <View style={s.tabs}>
        {DAYS.map(([k, short]) => (
          <TouchableOpacity
            key={k}
            style={[s.pill, tab === k && s.pillActive]}
            onPress={() => setTab(k)}
          >
            <Text style={tab === k ? s.pillTxtOn : undefined}>{short}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {content}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  table: {
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: C.border,
  },
  hdr: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: 22, fontWeight: "800", color: C.textPrimary },
  tabs: {
    flexDirection: "row",
    backgroundColor: C.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 20,
    alignItems: "center",
    backgroundColor: C.background,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  pillActive: { backgroundColor: M, borderColor: M },
  pillTxtOn: { color: "#fff" },
  thead: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: M,
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  hTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.surface,
  },
  card: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.surface,
  },
  time: { fontSize: 14, fontWeight: "500", color: "#000" },
  cN: { width: 28 },
  cT: { flex: 1 },
});
