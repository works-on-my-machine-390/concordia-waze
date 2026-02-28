import type { OpeningHoursModel } from "@/hooks/queries/buildingQueries";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ListSectionStyles } from "./BottomSheetListSection";
import {
  daysOfWeek,
  getIsOpen247,
  getOpenStatus,
  getOpenStatusColor,
} from "@/app/utils/dateUtils";

export default function OpeningHours({
  openingHours,
}: {
  readonly openingHours: OpeningHoursModel;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!openingHours || Object.keys(openingHours).length === 0) {
    return null;
  }
  const isOpen247 = getIsOpen247(openingHours);
  const openStatus = getOpenStatus(openingHours);
  const openStatusColor = getOpenStatusColor(openStatus);

  const renderListItem = (
    day: string,
    hours?: { open: string; close: string },
  ) => {
    const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);
    let hoursLabel: string;

    if (isOpen247) {
      hoursLabel = "Open 24 hours";
    } else if (!hours) {
      hoursLabel = "Closed";
    } else if (hours.open === "00:00" && !hours.close) {
      hoursLabel = "Open 24 hours";
    } else {
      hoursLabel = `${hours.open} - ${hours.close}`;
    }

    return (
      <View style={styles.row} key={day}>
        <Text style={[ListSectionStyles.listItem, styles.dayText]}>
          {formattedDay}:
        </Text>
        <Text style={[ListSectionStyles.listItem, styles.hoursText]}>
          {hoursLabel}
        </Text>
      </View>
    );
  };

  return (
    <View style={[ListSectionStyles.listContainer, { marginBottom: 8 }]}>
      <Pressable
        style={{ width: "100%" }}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
        onPress={() => setIsExpanded((prev) => !prev)}
      >
        <Text style={[ListSectionStyles.listTitle, { color: openStatusColor }]}>
          {openStatus}
        </Text>
      </Pressable>

      {isExpanded &&
        daysOfWeek.map((day) => {
          const hours = openingHours[day as keyof typeof openingHours];
          return renderListItem(day, hours);
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  dayText: {
    width: 95,
    marginBottom: 0,
  },
  hoursText: {
    flex: 1,
    marginBottom: 0,
  },
});
