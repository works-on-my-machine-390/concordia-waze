import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "@/app/constants";
import { CircleIcon, LocationIcon } from "@/app/icons";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  buildingCode: string;
  buildingName: string;
};

export default function IndoorItineraryHeader({
  buildingCode,
  buildingName,
}: Readonly<Props>) {
  const indoor = useIndoorNavigationStore();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const handleBack = () => {
    indoor.exitItinerary();
    indoor.setSelectedRoom(null);
  };

  const startText =
    indoor.start?.displayLabel || indoor.start?.label || "Select start";
  const endText =
    indoor.end?.displayLabel || indoor.end?.label || "Select destination";

  return (
    <View
      style={[styles.container, { paddingTop: insets.top + 10 }]}
      testID="indoor-itinerary-header"
      accessibilityLabel="Indoor itinerary header"
      pointerEvents="box-none"
    >
      <View style={styles.headerRow} pointerEvents="box-none">
        <View style={styles.leftButtons} pointerEvents="auto">
          <Pressable
            style={styles.iconButton}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="menu" size={26} color={COLORS.maroon} />
          </Pressable>

          <Pressable style={styles.iconButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={26} color={COLORS.maroon} />
          </Pressable>
        </View>

        <View style={styles.card} pointerEvents="auto">
          <View style={styles.locationsContainer}>
            <Pressable
              style={styles.locationRow}
              onPress={() => {
                indoor.setPickMode("start");
                router.push({
                  pathname: "/indoor-search",
                  params: {
                    buildingCode,
                    buildingName,
                    itineraryField: "start",
                  },
                });
              }}
            >
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
                  {startText}
                </Text>
              </View>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dotsConnector}>
                <View style={styles.dot} />
                <View style={styles.dot} />
                <View style={styles.dot} />
              </View>
              <View style={styles.dividerLine} />
            </View>

            <Pressable
              style={styles.locationRow}
              onPress={() => {
                indoor.setPickMode("end");
                router.push({
                  pathname: "/indoor-search",
                  params: {
                    buildingCode,
                    buildingName,
                    itineraryField: "end",
                  },
                });
              }}
            >
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
                  {endText}
                </Text>
              </View>
            </Pressable>
          </View>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 1000,
    marginTop: 10,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },

  leftButtons: {
    gap: 10,
  },

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 26,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",

    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },

  card: {
    flex: 1,
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