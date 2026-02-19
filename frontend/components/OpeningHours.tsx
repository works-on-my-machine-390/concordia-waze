import type { OpeningHours } from "@/hooks/queries/buildingQueries";
import { StyleSheet, Text, View } from "react-native";
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
  readonly openingHours: OpeningHours;
}) {
  const isOpen247 = getIsOpen247(openingHours);
  const openStatus = getOpenStatus(openingHours);
  const openStatusColor = getOpenStatusColor(openStatus);

  const renderListItem = (
    day: string,
    hours?: { open: string; close: string },
  ) => {
    const formattedDay = day.charAt(0).toUpperCase() + day.slice(1);

    // Handle 24/7 case first
    if (isOpen247) {
      return (
        <View style={styles.row} key={day}>
          <Text style={[ListSectionStyles.listItem, styles.dayText]}>
            {formattedDay}:
          </Text>
          <Text style={[ListSectionStyles.listItem, styles.hoursText]}>
            Open 24 hours
          </Text>
        </View>
      );
    }

    if (!hours) {
      return (
        <View style={styles.row} key={day}>
          <Text style={[ListSectionStyles.listItem, styles.dayText]}>
            {formattedDay}:
          </Text>
          <Text style={[ListSectionStyles.listItem, styles.hoursText]}>
            Closed
          </Text>
        </View>
      );
    }

    if (hours.open === "00:00" && !hours.close) {
      return (
        <View style={styles.row} key={day}>
          <Text style={[ListSectionStyles.listItem, styles.dayText]}>
            {formattedDay}:
          </Text>
          <Text style={[ListSectionStyles.listItem, styles.hoursText]}>
            Open 24 hours
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.row} key={day}>
        <Text style={[ListSectionStyles.listItem, styles.dayText]}>
          {formattedDay}:
        </Text>
        <Text style={[ListSectionStyles.listItem, styles.hoursText]}>
          {hours.open} - {hours.close}
        </Text>
      </View>
    );
  };

  return (
    <View style={ListSectionStyles.listContainer}>
      <Text style={[ListSectionStyles.listTitle, { color: openStatusColor }]}>
        {openStatus}
      </Text>

      {daysOfWeek.map((day) => {
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
