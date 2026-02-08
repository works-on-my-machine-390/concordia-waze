import React from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, LOGO_IMAGE } from "../app/constants";
import BackHeader from "./BackHeader";

type Props = {
  title: string;
  logoSize?: number;
  children: React.ReactNode;
};

export default function AuthLayout({ title, logoSize = 140, children }: Props) {
  return (
    <SafeAreaView style={styles.page}>
      <BackHeader />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.page}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>
            <View style={styles.logoContainer}>
              <Image
                source={LOGO_IMAGE}
                style={{ width: logoSize, height: logoSize }}
              />
              <Text style={styles.title}>{title}</Text>
            </View>

            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 30,
  },
  container: {
    width: "100%",
    maxWidth: 620,
    paddingHorizontal: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
});
