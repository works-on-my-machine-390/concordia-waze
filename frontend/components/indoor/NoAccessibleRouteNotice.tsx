import { COLORS } from "@/app/constants";
import { WheelchairIcon } from "@/app/icons";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

interface Props {
  visible: boolean;
}

export default function NoAccessibleRouteNotice({ visible }: Readonly<Props>) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: visible ? 1 : 0,
        duration: visible ? 260 : 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: visible ? 0 : -10,
        duration: visible ? 260 : 180,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible]);

  return (
    <Animated.View
      pointerEvents={visible ? "auto" : "none"}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.banner, { opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.pill}>
        <WheelchairIcon size={14} color={COLORS.surface} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>No accessible route</Text>
        <Text style={styles.sub}>No elevator on this floor — showing standard route.</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 12,
    left: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#92400e",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    zIndex: 200,
    shadowColor: "#000",
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 9,
  },
  pill: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.surface,
    letterSpacing: 0.1,
  },
  sub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.75)",
    marginTop: 1,
    lineHeight: 15,
  },
});