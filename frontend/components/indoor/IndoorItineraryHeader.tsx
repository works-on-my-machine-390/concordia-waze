import { COLORS } from "@/app/constants";
import { CircleIcon, LocationIcon } from "@/app/icons";
import { navigationHeaderStyles } from "@/app/styles/navigationHeaderStyles";
import {
  ModifyingFieldOptions,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { Ionicons } from "@expo/vector-icons";
import { DrawerActions } from "@react-navigation/native";
import { useNavigation, useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {};

export default function IndoorItineraryHeader({}: Readonly<Props>) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();

  const navigationState = useNavigationStore();

  const handleBack = () => {
    router.replace("/map");
  };

  const startText = navigationState.startLocation?.name || "Select start";
  const endText = navigationState.endLocation?.name || "Select destination";

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
            testID="open-drawer-btn"
            style={styles.iconButton}
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
          >
            <Ionicons name="menu" size={26} color={COLORS.maroon} />
          </Pressable>

          <Pressable
            testID="itinerary-back-btn"
            style={styles.iconButton}
            onPress={handleBack}
          >
            <Ionicons name="arrow-back" size={26} color={COLORS.maroon} />
          </Pressable>
        </View>

        <View style={navigationHeaderStyles.card} pointerEvents="auto">
          <View style={navigationHeaderStyles.locationsContainer}>
            <Pressable
              style={navigationHeaderStyles.locationRow}
              onPress={() => {
                navigationState.setModifyingField(ModifyingFieldOptions.start);
                router.push({
                  pathname: "/indoor-search",
                });
              }}
            >
              <View style={navigationHeaderStyles.iconContainer}>
                <CircleIcon size={16} />
              </View>
              <View style={navigationHeaderStyles.locationTextContainer}>
                <Text style={navigationHeaderStyles.locationLabel}>From</Text>
                <Text
                  style={navigationHeaderStyles.locationText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {startText}
                </Text>
              </View>
            </Pressable>

            <View style={navigationHeaderStyles.dividerRow}>
              <View style={navigationHeaderStyles.dotsConnector}>
                <View style={navigationHeaderStyles.dot} />
                <View style={navigationHeaderStyles.dot} />
                <View style={navigationHeaderStyles.dot} />
              </View>
              <View style={navigationHeaderStyles.dividerLine} />
            </View>

            <Pressable
              style={navigationHeaderStyles.locationRow}
              onPress={() => {
                navigationState.setModifyingField(ModifyingFieldOptions.end);
                router.push({
                  pathname: "/indoor-search",
                });
              }}
            >
              <View style={navigationHeaderStyles.iconContainer}>
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
