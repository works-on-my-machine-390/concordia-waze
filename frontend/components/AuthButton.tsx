/*
Button component that displays a loading spinner when authentication is in progress
*/
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LoginIcon, LogoutIcon } from "../app/icons";
import { colors } from "../app/styles/theme";

export default function AuthButton({
  title,
  onPress,
  disabled,
  loading,
  variant,
  loggedIn,
}: Readonly<{
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "default" | "menu";
  loggedIn?: boolean;
}>) {
  // Determining the title (Sign In/ Log Out) and icon for menu signin/logout buttons
  const menuTitle = loggedIn ? "Log out" : "Login";
  const icon = loggedIn ? <LogoutIcon /> : <LoginIcon />;
  return (
    <TouchableOpacity
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        variant === "menu" ? styles.menuButton : styles.button,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : variant === "menu" ? (
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={{ marginRight: 8 }}>{icon}</View>
          <Text style={styles.menuText}>{menuTitle}</Text>
        </View>
      ) : (
        <Text style={styles.text}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.maroon,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 12,
    shadowColor: colors.shadow,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 16,
    width: "100%",
  },
  menuButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  text: { color: "#fff", fontWeight: "700" },
  menuText: {
    color: colors.text,
    fontWeight: "700",
  },
});
