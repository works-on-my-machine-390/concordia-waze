/*
Login screen with email/password inputs, Concordia email validation, show/hide password toggle. 
- "Forgot password" link 
- Navigation to register screen for new users (Sign Up link)
*/

import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Toast } from "toastify-react-native";
import AuthButton from "../components/AuthButton";
import AuthInput from "../components/AuthInput";
import AuthLayout from "../components/AuthLayout";
import PasswordToggle from "../components/PasswordToggle";
import { TermsText } from "../components/SharedUI";
import { useAuth } from "../hooks/useAuth";
import { COLORS } from "./constants";
import { validateLogin } from "./utils/validators";

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
      router.replace("/map"); // Navigate to main app
      Toast.success("Login successful!");
    } else {
      setPassword("");
      setServerError((result as { success: false; error: string }).error);
    }
  }

  return (
    <AuthLayout title="Welcome back!" logoSize={150}>
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
        testID="email-input-login"
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
        testID="password-input-login"
        right={
          <PasswordToggle
            show={showPassword}
            onPress={() => setShowPassword((s) => !s)}
          />
        }
      />

      {!!serverError && <Text style={styles.serverError}>{serverError}</Text>}

      <AuthButton title="Sign in" onPress={handleSubmit} loading={loading} />

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <TouchableOpacity
          onPress={() => router.push({ pathname: "/register", params: { prev: "login" } })}
          testID="signup-link"
        >
          <Text style={styles.footerLink}>Sign up</Text>
        </TouchableOpacity>
      </View>

      <TermsText />
    </AuthLayout>
  );
}

const styles = StyleSheet.create({
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
  },
  footerText: {
    color: COLORS.textSecondary,
  },
  footerLink: {
    color: COLORS.maroon,
    fontWeight: "700",
  },
});
