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
  testID,
}: Readonly<{
  title?: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  variant?: "default" | "menu";
  loggedIn?: boolean;
}>) {
  // Determining the title (Sign In/ Log Out) and icon for menu signin/logout buttons
  const menuTitle = loggedIn ? "Log out" : "Login";
  const icon = loggedIn ? <LogoutIcon size={24} /> : <LoginIcon size={24} />;

  const renderTitleElement = () => {
    if (variant === "menu") {
      return (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ marginRight: 8 }}>{icon}</View>
          <Text style={styles.menuText}>{menuTitle}</Text>
        </View>
      );
    } else {
      return <Text style={styles.text}>{title}</Text>;
    }
  };
  return (
    <TouchableOpacity
      testID={testID}
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        variant === "menu" ? styles.menuButton : styles.button,
        disabled ? styles.buttonDisabled : null,
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : renderTitleElement()}
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
    gap: 20,
    width: "100%",
  },
  buttonDisabled: { opacity: 0.6 },
  text: { color: "#fff", fontWeight: "700" },
  menuText: {
    color: colors.text,
    fontWeight: "700",
    fontSize: 16,
  },
});
