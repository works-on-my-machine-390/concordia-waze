import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../app/constants";
import { CircleIcon, LocationIcon } from "../app/icons";

type NavigationHeaderProps = {
  startLocation: string;
  endLocation: string;
  onCancel: () => void;
  onStartLocationPress?: () => void;
  onEndLocationPress?: () => void;
};

export function NavigationHeader({
  startLocation,
  endLocation,
  onCancel,
  onStartLocationPress,
  onEndLocationPress,
}: NavigationHeaderProps) {
  return (
    <View
      style={styles.container}
      testID="navigation-header"
      accessibilityLabel="Navigation header"
    >
      <View style={styles.card}>
        <View style={styles.locationsContainer}>
          {/* Start location */}
          <Pressable style={styles.locationRow} onPress={onStartLocationPress}>
            <View style={styles.iconContainer}>
              <CircleIcon size={16} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>From</Text>
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {startLocation}
              </Text>
            </View>
          </Pressable>

          {/* Divider row with dots on the left */}
          <View style={styles.dividerRow}>
            <View style={styles.dotsConnector}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </View>
            <View style={styles.dividerLine} />
          </View>

          {/* End location */}
          <Pressable style={styles.locationRow} onPress={onEndLocationPress}>
            <View style={styles.iconContainer}>
              <LocationIcon size={20} color={COLORS.maroon} />
            </View>
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationLabel}>To</Text>
              <Text
                style={styles.locationText}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {endLocation}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
    marginTop: 10,
  },

  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  locationsContainer: {
    paddingVertical: 4,
  },

  locationRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  iconContainer: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },

  dotsConnector: {
    width: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },

  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#CCCCCC",
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#CCCCCC",
    marginLeft: 12,
  },

  endDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.maroon,
  },

  connectingLine: {
    width: 2,
    height: 20,
    backgroundColor: "#CCCCCC",
    marginLeft: 15,
    marginVertical: 2,
  },

  locationTextContainer: {
    flex: 1,
    marginLeft: 10,
    paddingVertical: 2,
  },

  locationLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 1,
  },

  locationText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});
