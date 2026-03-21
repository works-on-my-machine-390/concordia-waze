import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../../app/constants";
import type {
  NormalizedScheduleClass,
  NormalizedScheduleCourse,
} from "../../app/utils/schedule/types";

type Props = {
  courses: NormalizedScheduleCourse[];
};

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"] as const;
const JS_DAY_TO_SCHEDULE_DAY = [
  "SUN",
  "MON",
  "TUE",
  "WED",
  "THU",
  "FRI",
  "SAT",
] as const;

const START_HOUR = 8;
const END_HOUR = 22;
const HOUR_HEIGHT = 72;
const TIME_COLUMN_WIDTH = 56;
const DAY_COLUMN_WIDTH = 120;

function timeToMinutes(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function formatHour(hour24: number): string {
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12} ${suffix}`;
}

function flattenCourses(courses: NormalizedScheduleCourse[]): Array<
  NormalizedScheduleClass & { courseName: string }
> {
  return courses.flatMap((course) =>
    course.classes.map((classItem) => ({
      courseName: course.name,
      ...classItem,
    })),
  );
}

export default function WeeklyScheduleView({ courses }: Readonly<Props>) {
  const horizontalScrollRef = useRef<ScrollView>(null);

  const classes = useMemo(() => flattenCourses(courses), [courses]);
  const totalHeight = (END_HOUR - START_HOUR) * HOUR_HEIGHT;

  const today = JS_DAY_TO_SCHEDULE_DAY[new Date().getDay()];
  const todayIndex = DAYS.indexOf(today as (typeof DAYS)[number]);

  useFocusEffect(
    useCallback(() => {
      if (todayIndex === -1) {
        return;
      }

      const xOffset = Math.max(
        0,
        todayIndex * DAY_COLUMN_WIDTH - DAY_COLUMN_WIDTH,
      );

      const timeout = setTimeout(() => {
        horizontalScrollRef.current?.scrollTo({
          x: xOffset,
          animated: true,
        });
      }, 100);

      return () => clearTimeout(timeout);
    }, [todayIndex]),
  );

  return (
    <ScrollView
      ref={horizontalScrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      <View>
        <View style={styles.headerRow}>
          <View style={styles.timeHeaderCell} />

          {DAYS.map((day) => {
            const isToday = day === today;

            return (
              <View
                key={day}
                style={[
                  styles.dayHeaderCell,
                  { width: DAY_COLUMN_WIDTH },
                  isToday && styles.todayHeaderCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayHeaderText,
                    isToday && styles.todayHeaderText,
                  ]}
                >
                  {day}
                </Text>
              </View>
            );
          })}
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.scheduleRow}>
            <View style={{ width: TIME_COLUMN_WIDTH }}>
              {Array.from({ length: END_HOUR - START_HOUR }).map((_, index) => {
                const hour = START_HOUR + index;

                return (
                  <View
                    key={hour}
                    style={[styles.timeCell, { height: HOUR_HEIGHT }]}
                  >
                    <Text style={styles.timeText}>{formatHour(hour)}</Text>
                  </View>
                );
              })}
            </View>

            <View
              style={{
                width: DAY_COLUMN_WIDTH * DAYS.length,
                height: totalHeight,
                position: "relative",
              }}
            >
              {DAYS.map((day, dayIndex) => {
                const isToday = day === today;

                return (
                  <View
                    key={day}
                    style={[
                      styles.dayColumn,
                      {
                        left: dayIndex * DAY_COLUMN_WIDTH,
                        width: DAY_COLUMN_WIDTH,
                        height: totalHeight,
                      },
                      isToday && styles.todayColumn,
                    ]}
                  >
                    {Array.from({ length: END_HOUR - START_HOUR }).map(
                      (_, index) => (
                        <View
                          key={`${day}-${START_HOUR + index}`}
                          style={[
                            styles.hourLine,
                            { top: index * HOUR_HEIGHT, height: HOUR_HEIGHT },
                          ]}
                        />
                      ),
                    )}
                  </View>
                );
              })}

              {classes.map((item, index) => {
                const dayIndex = DAYS.indexOf(item.day);
                if (dayIndex === -1) {
                  return null;
                }

                const startMinutes = timeToMinutes(item.startTime);
                const endMinutes = timeToMinutes(item.endTime);
                const minutesFromStart = startMinutes - START_HOUR * 60;
                const durationMinutes = endMinutes - startMinutes;

                if (minutesFromStart < 0 || durationMinutes <= 0) {
                  return null;
                }

                const top = (minutesFromStart / 60) * HOUR_HEIGHT;
                const height = (durationMinutes / 60) * HOUR_HEIGHT;
                const backgroundColor =
                  index % 2 === 0 ? COLORS.maroon : COLORS.selectionBlue;
                const location = [item.buildingCode, item.room]
                  .filter(Boolean)
                  .join(" ");

                return (
                  <View
                    key={`${item.courseName}-${item.day}-${item.startTime}-${index}`}
                    style={[
                      styles.classBlock,
                      {
                        left: dayIndex * DAY_COLUMN_WIDTH + 6,
                        top,
                        width: DAY_COLUMN_WIDTH - 12,
                        height,
                        backgroundColor,
                      },
                    ]}
                  >
                    <Text style={styles.classTitle} numberOfLines={1}>
                      {item.courseName}
                    </Text>

                    <Text style={styles.classSubtitle} numberOfLines={1}>
                      {item.type}
                    </Text>

                    <Text style={styles.classText} numberOfLines={1}>
                      {item.startTime} - {item.endTime}
                    </Text>

                    <Text style={styles.classText} numberOfLines={1}>
                      {location}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  timeHeaderCell: {
    width: TIME_COLUMN_WIDTH,
    height: 48,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  dayHeaderCell: {
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  todayHeaderCell: {
    backgroundColor: "#F4E8EE",
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  todayHeaderText: {
    color: COLORS.maroon,
  },
  scheduleRow: {
    flexDirection: "row",
  },
  timeCell: {
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 4,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#E5E5E5",
    backgroundColor: "#FAFAFA",
  },
  timeText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  dayColumn: {
    position: "absolute",
    top: 0,
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
    backgroundColor: "#fff",
  },
  todayColumn: {
    backgroundColor: "#FCF7F9",
  },
  hourLine: {
    position: "absolute",
    left: 0,
    right: 0,
    borderBottomWidth: 1,
    borderBottomColor: "#EAEAEA",
  },
  classBlock: {
    position: "absolute",
    borderRadius: 10,
    padding: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  classTitle: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  classSubtitle: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  classText: {
    color: "#fff",
    fontSize: 10,
    marginTop: 2,
  },
});