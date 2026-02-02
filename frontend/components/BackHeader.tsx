/*
Back header to go back to previous page
(Make sure to pass the "prev" param when navigating from page to page so that header knows what previous page was)
*/

import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { COLORS, BACK_ICON } from "../app/constants";

interface HeaderProps {
    title?:String
}

const BackHeader = ({ title }: HeaderProps) => {
    const router = useRouter();
    const params = useLocalSearchParams<{ prev?: string }>();

    // Determine the previous page
    let headerTitle = title;

    if (!headerTitle){
        switch (params.prev) {
            case "login":
                headerTitle = "Log In";
                break;
            case "register":
                headerTitle = "Sign Up";
                break;
            case "index":
            default:
                headerTitle = "Home Page"
        }
    }

    // Physical header
    return (
        <View style={styles.container}>
            <TouchableOpacity 
                style={styles.backButtonTitle} 
                onPress={() => router.back()}
            >
                <Image source={BACK_ICON} style={styles.backIcon} />
                <Text style={styles.title}>{headerTitle}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 20,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  backButtonTitle: {
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
    },
  backIcon: {
    width: 24,
    height: 24,
    resizeMode: "contain",
  },
  title: {
    textAlign: "left",
    marginLeft: 10,
    fontSize: 16,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
});

export default BackHeader;