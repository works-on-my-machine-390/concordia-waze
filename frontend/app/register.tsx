/*
Registration form collecting full name, email, password, and password confirmation with validation for all fields
- show/hide toggles for both password inputs (+ password strength)
- Concordia email verification
- Automatic navigation to login if successful registration
*/

import React, { useState } from "react";
import { 
  View, 
  Text, 
  StyleSheet, 
  KeyboardAvoidingView, 
  Platform,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import AuthInput from "../components/AuthInput";
import AuthButton from "../components/AuthButton";
import { PasswordToggle, TermsText } from "../components/SharedUI";
import { useAuth } from "../hooks/useAuth";
import { validateRegister } from "./utils/validators";
import { APP_INFO, COLORS, LOGO_IMAGE, LOGO_SIZE } from "./constants";

const MIN_PASSWORD_LENGTH = 6;

export default function RegisterScreen() {
  const router = useRouter();
  const { register, loading } = useAuth();
  
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  const clearFieldError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const showPasswordHelper = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  async function handleSubmit() {
    setServerError(null);
    
    const validation = validateRegister({ fullName, email, password, confirmPassword });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const result = await register(fullName, email.trim().toLowerCase(), password);
    
    if (result.success) {
      alert("Registration successful! Please log in.");
      router.push("/login");
    } else {
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
        <View style={styles.card}>
          <Image source={LOGO_IMAGE} style={LOGO_SIZE} />
          
          <Text style={styles.title}>{APP_INFO.name}</Text>
          <Text style={styles.subtitle}>{APP_INFO.taglineShort}</Text>
          <Text style={styles.heading}>Create an account</Text>

          <AuthInput 
            label="Full name*" 
            placeholder="John Doe" 
            value={fullName} 
            onChange={(v) => {
              setFullName(v);
              clearFieldError("fullName");
            }}
            error={errors.fullName}
            autoCapitalize="words"
          />
          
          <AuthInput 
            label="Email*" 
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
            label="Password*" 
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
          {showPasswordHelper && (
            <Text style={styles.helperText}>
              Must be at least {MIN_PASSWORD_LENGTH} characters
            </Text>
          )}

          <AuthInput 
            label="Confirm Password*" 
            placeholder="••••••••" 
            value={confirmPassword} 
            onChange={(v) => {
              setConfirmPassword(v);
              clearFieldError("confirmPassword");
            }}
            secureTextEntry={!showConfirmPassword}
            error={errors.confirmPassword}
            right={
              <PasswordToggle 
                show={showConfirmPassword} 
                onToggle={() => setShowConfirmPassword(!showConfirmPassword)} 
              />
            }
          />

          {serverError && <Text style={styles.serverError}>{serverError}</Text>}

          <AuthButton title="Sign up" onPress={handleSubmit} loading={loading} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push("/login")}>
              <Text style={styles.footerLink}>Sign in</Text>
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
  card: {
    width: 620,
    maxWidth: "94%",
    backgroundColor: COLORS.surface,
    padding: 24,
    borderRadius: 10,
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
    marginBottom: 12,
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
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