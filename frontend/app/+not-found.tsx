import { router } from "expo-router";
import { View, Pressable, StyleSheet, Text, Image } from "react-native";
import { COLORS, DIZZY_LOGO_IMAGE } from "./constants";

export default function NotFound() {
  return (
    <View style={styles.container}>
      <Image
        source={DIZZY_LOGO_IMAGE}
        style={{
          width: 200,
          height: 200,
          marginBottom: 8,
        }}
      />
      <Text style={styles.title}>404</Text>
      <Text style={styles.message}>Page Not Found</Text>
      <Text style={styles.description}>
        The page you're looking for doesn't exist.
      </Text>
      <Text style={styles.caption}>you've entered the wrong classroom!</Text>

      <Pressable style={styles.button} onPress={() => router.push("/")}>
        <Text style={styles.buttonText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    marginBottom: 10,
  },
  message: {
    fontSize: 24,
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  caption: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 30,
    fontStyle: "italic",
  },
  button: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
