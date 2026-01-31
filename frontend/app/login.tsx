/*
Login screen with email/password inputs, Concordia email validation, show/hide password toggle. 
- "Forgot password" link 
- Navigation to register screen for new users (Sign Up link)
*/

import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import { PasswordToggle, TermsText } from "../components/SharedUI";
import { validateLogin } from "./utils/validators";
import { useAuth } from "../hooks/useAuth";
import { APP_INFO, COLORS, LOGO_IMAGE, LOGO_SIZE } from "./constants";

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
      setServerError(result.error);
    }
  }

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined} 
      style={styles.page}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <Image source={LOGO_IMAGE} style={LOGO_SIZE} />
          
          <Text style={styles.title}>{APP_INFO.name}</Text>
          <Text style={styles.subtitle}>{APP_INFO.tagline}</Text>
          <Text style={styles.heading}>Welcome back!</Text>
          
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

          <AuthInput
            label="Password"
            placeholder="••••••••"
            value={password}
            onChange={(v) => {
              setPassword(v);
              clearFieldError("password");
            }}
            secureTextEntry={!showPassword}
            error={errors.password}
            right={
              <PasswordToggle 
                show={showPassword} 
                onToggle={() => setShowPassword(!showPassword)} 
              />
            }
          />

          <TouchableOpacity 
            onPress={() => console.log("Forgot password")}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot password?</Text>
          </TouchableOpacity>

          {serverError && <Text style={styles.serverError}>{serverError}</Text>}

          <AuthButton title="Sign in" onPress={handleSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.footerLink}>Sign up</Text>
            </TouchableOpacity>
          </View>

          <TermsText />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    width: 620,
    maxWidth: "94%",
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 10,
    alignItems: "stretch",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 4,
  },
  title: { 
    fontSize: 20, 
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
    marginTop: 12, 
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