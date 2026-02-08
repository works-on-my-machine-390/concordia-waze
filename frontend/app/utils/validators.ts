/*
Validation functions for login and register forms using regex pattern to verify valid email addresses (@gmail.com, @mail.concordia.ca, @live.concordia.ca, etc.)
Checking password minimum length (6 characters), confirming password match, and full name presence.
Returning field-specific error messages.
*/

export const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

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
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Please use an email in the format content@content.content";
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
  } else if (!EMAIL_REGEX.test(email)) {
    errors.email = "Please use an email in the format content@content.content";
  }
  if (!password) {
    errors.password = "Password is required.";
  }
  return errors;
}
