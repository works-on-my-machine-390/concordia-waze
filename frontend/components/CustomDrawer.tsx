import { COLORS } from "@/app/constants";
import { AccountIcon } from "@/app/icons";
import { useAuth } from "@/hooks/useAuth";
import {
  DrawerContentScrollView,
  DrawerItemList,
} from "@react-navigation/drawer";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AuthButton from "./AuthButton";

export default function CustomDrawer(props: any) {
  const router = useRouter();
  const { top, bottom } = useSafeAreaInsets();
  const { loggedIn, logout } = useAuth();

  const handleAuthAction = () => {
    if (loggedIn) {
      logout();
      router.replace("/");
    } else {
      router.push("/login");
    }
  };

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={[COLORS.conuRed, "#521420"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: top + 20, borderTopRightRadius: 16 },
        ]}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatar}>
            <AccountIcon size={40} color={COLORS.goldDark} />
          </View>
          <Text style={styles.name}>User Name</Text>
        </View>
      </LinearGradient>
      <DrawerContentScrollView
        {...props}
        contentContainerStyle={{ paddingTop: 8 }}
      >
        <DrawerItemList {...props} />
      </DrawerContentScrollView>

      <View style={[styles.footer, { paddingBottom: bottom }]}>
        <AuthButton
          variant="menu"
          loggedIn={loggedIn}
          onPress={handleAuthAction}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 200,
    width: "100%",
    padding: 24,
    alignItems: "flex-end",
    flexDirection: "column",
    justifyContent: "flex-end",
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
    width: "100%",
  },

  avatar: {
    width: 64,
    height: 64,
    borderRadius: 64,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.gold,
  },
  name: { fontSize: 24, color: COLORS.conuRedLight },
  footer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
});
