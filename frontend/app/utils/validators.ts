/*
Validation functions for login and register forms using regex pattern to verify Concordia email addresses (@concordia.ca, @mail.concordia.ca, @live.concordia.ca)
Checking password minimum length (6 characters), confirming password match, and full name presence.
Returning field-specific error messages.
*/

export const CONCORDIA_EMAIL_REGEX =
  /^[A-Za-z0-9._%+-]+@(?:(?:mail|live)\.)?concordia\.ca$/i;

export function validateRegister({
  fullName,
  email,
  password,
  confirmPassword,
}: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
}) {
  const errors: Record<string, string> = {};
  if (!fullName || fullName.trim().length < 2) {
    errors.fullName = "Please enter your full name.";
  }
  if (!email) {
    errors.email = "Email is required.";
  } else if (!CONCORDIA_EMAIL_REGEX.test(email)) {
    errors.email = "Please use your Concordia email (example@live.concordia.ca).";
  }
  if (!password) {
    errors.password = "Password is required.";
  } else if (password.length < 6) {
    errors.password = "Password must be at least 6 characters.";
  }
  if (!confirmPassword) {
    errors.confirmPassword = "Please confirm your password.";
  } else if (password !== confirmPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }
  return errors;
}

export function validateLogin({ email, password }: { email: string; password: string }) {
  const errors: Record<string, string> = {};
  if (!email) {
    errors.email = "Email is required.";
  } else if (!CONCORDIA_EMAIL_REGEX.test(email)) {
    errors.email = "Please use your Concordia email (example@live.concordia.ca).";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  return errors;
}