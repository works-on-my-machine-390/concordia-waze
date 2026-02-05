/*
Login screen with email/password inputs, Concordia email validation, show/hide password toggle. 
- "Forgot password" link 
- Navigation to register screen for new users (Sign Up link)
*/

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AuthButton from "../components/AuthButton";
import AuthInput from "../components/AuthInput";
import BackHeader from "../components/BackHeader";
import { TermsText } from "../components/SharedUI";
import { useAuth } from "../hooks/useAuth";
import { COLORS, LOGO_IMAGE } from "./constants";
import { EyeHidingIcon, EyeShowingIcon } from "./icons";
import { validateLogin } from "./utils/validators";

const LOGO_SIZE_LOGIN = 150;

export default function LoginScreen() {
  const router = useRouter();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  async function handleSubmit() {
    setServerError(null);
    
    const validation = validateLogin({ email, password });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const result = await login(email.trim().toLowerCase(), password);

    if (result.success) {
      console.log("Login successful!", result.data);
      // router.replace("/(tabs)"); // Navigate to main app
      alert("Login successful!");
    } else {
      setPassword("");
      setServerError((result as { success: false; error: string }).error);
    }
  }

  return (
    <SafeAreaView style={styles.page}>
      <BackHeader/>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined} 
        style={styles.page}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.container}>

            <View style={styles.logoNameContainer}>
              <Image
                source={LOGO_IMAGE}
                style={styles.logo}
              />
              <Text style={styles.title}>Welcome back!</Text>
            </View>
            
            <AuthInput
              label="Email"
              placeholder="you@live.concordia.ca"
              value={email}
              onChange={(v) => {
                setEmail(v);
                clearFieldError("email");
              }}
              keyboardType="email-address"
              error={errors.email}
            />

            <View style={styles.passwordContainer}>
              {/* Row with password label + forgot password link */}
              <View style={styles.passwordLabelRow}>
                <Text style={styles.inputLabel}>Password</Text>
                <TouchableOpacity onPress={() => console.log("Forgot password")}>
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Input field */}
              <AuthInput
                placeholder="Password"
                value={password}
                onChange={(v) => {
                  setPassword(v);
                  clearFieldError("password");
                }}
                secureTextEntry={!showPassword}
                error={errors.password}
                right={
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                          {showPassword 
                            ? <EyeHidingIcon size={24} color={COLORS.maroon}/>  
                            : <EyeShowingIcon size={24} color={COLORS.maroon}/> 
                          }
                  </TouchableOpacity>
                }
              />
            </View>


            {serverError && <Text style={styles.serverError}>{serverError}</Text>}

            <AuthButton title="Sign in" onPress={handleSubmit} loading={loading} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push({ pathname: "/register", params: { prev: "login" } })}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>

            <TermsText />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { 
    flex: 1, 
    backgroundColor: COLORS.background
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: 30,
  },
  container: {
    width: "100%",
    maxWidth: 620,
    backgroundColor: COLORS.background,
    alignItems: "stretch",
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 30
  },
  logoNameContainer : {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30
  },
  logo: {
    width: LOGO_SIZE_LOGIN,
    height: LOGO_SIZE_LOGIN,
  },
  title: { 
    fontSize: 30, 
    fontWeight: "700", 
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: { 
    textAlign: "center", 
    color: COLORS.textMuted,
    marginBottom: 16, 
    marginTop: 6,
  },
  heading: { 
    fontSize: 18, 
    fontWeight: "700", 
    marginVertical: 8,
  },
  passwordContainer: {
    width: "100%",
    marginTop: 12,
    marginBottom: 12, // spacing between fields
  },
  passwordLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4, 
  },
  inputLabel: {
    fontWeight: "600",
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginVertical: 4,
  },
  forgotPasswordText: {
    color: COLORS.maroon,
    fontWeight: "600",
    fontSize: 14,
  },
  serverError: { 
    color: COLORS.error,
    marginVertical: 8,
    textAlign: "center",
    fontWeight: "600",
  },
  footer: { 
    flexDirection: "row", 
    justifyContent: "center", 
    marginTop: 20, 
    alignItems: "center",
  },
  footerText: {
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.maroon,
    fontWeight: "700",
  },
});