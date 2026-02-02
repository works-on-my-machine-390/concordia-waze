/*
Home Page displaying the Concordia Waze logo, app name, tagline, and two buttons: 
    "Sign Up / Log in" navigates users to log in page 
    "Use without account" offers guest access (not available yet)
*/

import { useRouter } from "expo-router";
import { Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { APP_INFO, COLORS, LOGO_IMAGE } from "./constants";
import { AccountIcon, NoAccountIcon } from "./icons";

const LOGO_SIZE_HOME = 200;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.page}>
      <View style={styles.container}>
        
        {/*
          View for the logo + name + text
        */}
        <View style={styles.logoNameContainer}>
          <Image
            source={LOGO_IMAGE}
            style={styles.logo}
          />
          <Text style={styles.title}>{APP_INFO.name}</Text>
          <Text style={styles.subtitle}>{APP_INFO.tagline}</Text>
        </View>

        {/*
          View for the "signup/login" button + "use without account" button
        */}
        <View>
          {/*
          Signup/login button
          */}
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/login", params: { prev: "index" } })}
            style={[styles.button, styles.primaryButton]}
          >
            <View style={styles.buttonContent}>
                  <View style={[styles.iconCircle, styles.iconCirclePrimaryButton]}>
                    <AccountIcon size={35} color={COLORS.maroon}/>
                  </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonPrimaryText}>Sign Up / Log in</Text>
                <Text style={styles.buttonSecondaryText}>Save your schedule and favorites for long-term use</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/*
          No account button
          */}
          <TouchableOpacity
            onPress={() => console.log("Use without account")}
            style={[styles.button, styles.secondaryButton]}
          >
            <View style={styles.buttonContent}>
              <View style={[styles.iconCircle, styles.iconCircleSecondaryButton]}>
                    <NoAccountIcon size={35} color={COLORS.gold}/>
              </View>
              <View style={styles.buttonTextContainer}>
                <Text style={styles.buttonPrimaryText}>Use without account</Text>
                <Text style={styles.buttonSecondaryText}>Your data stays on this device only</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    padding: 28
  },
  container : {
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 40
  },
  logoNameContainer : {
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: LOGO_SIZE_HOME,
    height: LOGO_SIZE_HOME,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    marginTop: 8,
  },
  subtitle: {
    color: COLORS.textMuted,
    marginTop: 6,
    marginBottom: 20,
    textAlign: "center",
    fontSize: 15,
  },
  button : {
    width: "100%",
    backgroundColor: COLORS.background,
    borderWidth: 2.5,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignItems: "flex-start",
    justifyContent: "center",
    marginTop: 10,
    marginBottom: 10,
    marginHorizontal: 15,
    minHeight: 100,
    // Styling for shadow
    shadowColor: "#000",        // shadow color
    shadowOffset: { width: 0, height: 2 }, // offset of shadow
    shadowOpacity: 0.25,        // opacity of shadow
    shadowRadius: 3.84,         // blur radius
    elevation: 5 //this is shadow for Android because the above shadow styling doesn't work on Android (manel - not sure how it renders since I am on iOS)
  },
  primaryButton: {
    borderColor: COLORS.maroon,
  },
  buttonPrimaryText: {
    color: COLORS.textPrimary,
    fontWeight: "700",
    marginBottom: 3,
    fontSize: 15
  },
  buttonSecondaryText: {
    color: COLORS.textMuted,
    fontWeight: "400",
  },
  secondaryButton: {
    borderColor: COLORS.gold,
  },
  buttonContent : {
    flexDirection: "row",
    alignItems: "center"
  },
  iconCircle: {
    width: 60,                
    height: 60,              
    borderRadius: 30,        
    alignItems: "center",    
    justifyContent: "center", 
    marginRight: 15,          
  },
  iconCirclePrimaryButton: {
    backgroundColor: "#e1c4c9", 
  },
  iconCircleSecondaryButton: {
    backgroundColor: "#e6e2d6"
  },
  buttonTextContainer : {
    flex: 1
  }
});