import {
  NavigationPhase,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { COLORS } from "../app/constants";
import { CircleIcon, LocationIcon } from "../app/icons";
import ActiveNavigationHeader from "./activeNavigation/ActiveNavigationHeader";
import { navigationHeaderStyles as styles } from "@/app/styles/navigationHeaderStyles";

type NavigationHeaderProps = {
  onStartLocationPress?: () => void;
  onEndLocationPress?: () => void;
};

export function NavigationHeader({
  onStartLocationPress,
  onEndLocationPress,
}: Readonly<NavigationHeaderProps>) {
  const navigationState = useNavigationStore();

  if (navigationState.navigationPhase === NavigationPhase.ACTIVE)
    return <ActiveNavigationHeader />;

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
                {navigationState.startLocation?.name || "Select start"}
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
                {navigationState.endLocation?.name || "Select destination"}
              </Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
