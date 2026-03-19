import {
  getGoogleAuthStatus,
  isAuthRequired,
} from "@/hooks/queries/googleAuthQueries";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";
import { Toast } from "toastify-react-native";
import { COLORS } from "../app/constants";

type Props = {
  onPress?: () => void | Promise<void>;
};

export default function SyncCalendarButton({ onPress }: Readonly<Props>) {
  const [loading, setLoading] = useState(false);

  const handlePress = async () => {
    if (loading) {
      return;
    }

    setLoading(true);
    try {
      const status = await getGoogleAuthStatus();

      if (isAuthRequired(status)) {
        await WebBrowser.openBrowserAsync(status.url);
        Toast.info(
          "Finish Google authentication in browser, then tap sync again.",
        );
        return;
      }

      if (onPress) {
        await onPress();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={loading}
      accessibilityRole="button"
    >
      {loading ? (
        <ActivityIndicator size="small" color={COLORS.background} />
      ) : (
        <Text style={styles.text}>Sync Calendar</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.maroon,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 4,
    alignSelf: "flex-end",
    marginRight: 16,
  },
  buttonDisabled: {
    opacity: 0.8,
  },
  text: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "600",
  },
});
