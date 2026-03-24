import { COLORS } from "@/app/constants";
import { GetDirectionsIcon, TimeIcon } from "@/app/icons";
import { toMinutes } from "@/app/utils/dateUtils";
import { NextClassResponse } from "@/hooks/queries/classQueries";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  nextClass: NextClassResponse | null;
  onNavigatePress: () => void;
};

const getMinutesUntil = (startTime: string): number => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  return toMinutes(startTime) - nowMinutes;
};

const formatTimeUntil = (minutes: number): string => {
  if (minutes < 60) return `${minutes} MIN.`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins === 0 ? `${hours}H` : `${hours}H${String(mins).padStart(2, "0")}`;
};

export default function NextClassCard({
  nextClass,
  onNavigatePress,
}: Readonly<Props>) {
  const [minutesUntil, setMinutesUntil] = useState(() =>
    nextClass?.item?.startTime
      ? getMinutesUntil(nextClass.item.startTime)
      : null,
  );

  useEffect(() => {
    if (!nextClass?.item?.startTime) return;
    setMinutesUntil(getMinutesUntil(nextClass.item.startTime));
  }, [nextClass?.item?.startTime]);

  useEffect(() => {
    if (!nextClass) return;

    const now = new Date();
    const msUntilNextMinute = //im getting the next minute just to make sure that the time left is accurate (and that we dont start calculating one minute from whenever it was rendered)
      (60 - now.getSeconds()) * 1000 - now.getMilliseconds();

    const timeout = setTimeout(() => {
      if (!nextClass?.item?.startTime) return;
      setMinutesUntil(getMinutesUntil(nextClass.item.startTime));

      const interval = setInterval(() => {
        if (!nextClass?.item?.startTime) return;
        setMinutesUntil(getMinutesUntil(nextClass.item.startTime));
      }, 60000);

      return () => clearInterval(interval);
    }, msUntilNextMinute);

    return () => clearTimeout(timeout);
  }, [nextClass?.item?.startTime]);

  if (!nextClass?.item) {
    return (
      <View style={styles.card}>
        <View style={styles.topLeft}>
          <TimeIcon size={12} color={COLORS.conuRedLight} />
          <Text style={styles.timeUntilText}>NO MORE CLASSES TODAY</Text>
        </View>
      </View>
    );
  }

  const { className, item } = nextClass;

  const hasStarted = minutesUntil !== null && minutesUntil <= 0;
  const location = `${item.buildingCode.toUpperCase()} ${item.room}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <TimeIcon size={12} color={COLORS.conuRedLight} />
          <Text style={styles.timeUntilText}>
            {hasStarted
              ? "CLASS IN PROGRESS"
              : `NEXT CLASS IN ${formatTimeUntil(minutesUntil)}`}
          </Text>
        </View>
        <Text style={styles.startTimeText}>
          {hasStarted ? `${item.startTime} - ${item.endTime}` : item.startTime}
        </Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.bottomRow}>
        <View style={styles.classInfo}>
          <Text style={styles.classNameText}>{className.toUpperCase()} - {item.type.slice(0, 3).toUpperCase()}</Text>
          <Text style={styles.locationText}>{location}</Text>
        </View>
        <Pressable style={styles.navigateButton} onPress={onNavigatePress}>
          <GetDirectionsIcon size={30} color={COLORS.conuRed} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.conuRed,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    marginBottom: 12,
    padding: 16,
    gap: 10,
    minWidth: 300,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  timeUntilText: {
    color: COLORS.conuRedLight,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  startTimeText: {
    color: COLORS.conuRedLight,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.conuRedLight,
    opacity: 0.3,
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  classInfo: {
    gap: 4,
    flex: 1,
    marginRight: 12,
  },
  classNameText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  locationText: {
    color: COLORS.surface,
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.85,
  },
  navigateButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: 6,
  },
});
