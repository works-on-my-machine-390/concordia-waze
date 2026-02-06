/*
Registration form collecting full name, email, password, and password confirmation with validation for all fields
- show/hide toggles for both password inputs (+ password strength)
- Concordia email verification
- Automatic navigation to login if successful registration
*/

import { useRouter } from "expo-router";
import { useState } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import AuthButton from "../components/AuthButton";
import AuthInput from "../components/AuthInput";
import AuthLayout from "../components/AuthLayout";
import { TermsText } from "../components/SharedUI";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "./constants";
import { EyeHidingIcon, EyeShowingIcon } from "./icons";
import { validateRegister } from "./utils/validators";
import PasswordToggle from "../components/PasswordToggle";

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

  async function handleSubmit() {
    setServerError(null);

    const validation = validateRegister({
      fullName,
      email,
      password,
      confirmPassword,
    });
    setErrors(validation);
    if (Object.keys(validation).length) return;

    const result = await register(
      fullName,
      email.trim().toLowerCase(),
      password,
    );

    if (result.success) {
      alert("Registration successful! Please log in.");
      router.push({ pathname: "/login", params: { prev: "register" } });
    } else {
      setServerError((result as { success: false; error: string }).error);
    }
  }

  const showPasswordHelper =
    password.length > 0 && password.length < MIN_PASSWORD_LENGTH;

  return (
    <AuthLayout title="Create an account!" logoSize={125}>
      <AuthInput
        label="Full name"
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
        placeholder="Password"
        value={password}
        onChange={(v) => {
          setPassword(v);
          clearFieldError("password");
        }}
        secureTextEntry={!showPassword}
        error={errors.password}
        right={<PasswordToggle show={showPassword} onPress={() => setShowPassword((s) => !s)} />}
      />

      {showPasswordHelper && (
        <Text style={styles.helperText}>
          Must be at least {MIN_PASSWORD_LENGTH} characters
        </Text>
      )}

      <AuthInput
        label="Confirm password"
        placeholder="Password"
        value={confirmPassword}
        onChange={(v) => {
          setConfirmPassword(v);
          clearFieldError("confirmPassword");
        }}
        secureTextEntry={!showConfirmPassword}
        error={errors.confirmPassword}
        right={<PasswordToggle show={showConfirmPassword} onPress={() => setShowConfirmPassword((s) => !s)} />}
      />

      {!!serverError && (
        <Text style={styles.serverError}>{serverError}</Text>
      )}

      <AuthButton title="Sign up" onPress={handleSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account? </Text>
        <TouchableOpacity onPress={() => router.push("/login")}>
          <Text style={styles.footerLink}>Sign in</Text>
        </TouchableOpacity>
      </View>

      <TermsText />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  },
  footerText: {
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.maroon,
    fontWeight: "700",
  },
});
