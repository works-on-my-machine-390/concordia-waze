import { validateRegister, validateLogin } from "../app/utils/validators";

describe("validateRegistration", () => {
  it("should return no errors for valid input", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "securePass123",
      confirmPassword: "securePass123",
    });
    expect(errors).toEqual({});
  });

  // Full Name Validation Tests
  it("should return error when fullName is missing", () => {
    const errors = validateRegister({
      fullName: "",
      email: "john@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.fullName).toBe("Please enter your full name.");
  });

  it("should return error when fullName has length less than 2", () => {
    const errors = validateRegister({
      fullName: "J",
      email: "john@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.fullName).toBe("Please enter your full name.");
  });

  // Email Validation Tests
  it("should return error when email is missing", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBe("Email is required.");
  });

  it("should return error when email format is invalid", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "invalid-email",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  it("should accept valid email with subdomain", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "test@concordia.ca",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBeUndefined();
  });

  it("should reject email without @ symbol", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "testconcordia.ca",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  it("should reject email without domain", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "test@",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  // Password Validation Tests
  it("should return error when password is missing", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "",
      confirmPassword: "password",
    });
    expect(errors.password).toBe("Password is required.");
  });

  it("should return error when password length is less than 6", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "12345",
      confirmPassword: "12345",
    });
    expect(errors.password).toBe("Password must be at least 6 characters.");
  });

  it("should accept password with exactly 6 characters", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "pass12",
      confirmPassword: "pass12",
    });
    expect(errors.password).toBeUndefined();
  });

  // Confirm Password Validation Tests
  it("should return error when confirmPassword is missing", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "password",
      confirmPassword: "",
    });
    expect(errors.confirmPassword).toBe("Please confirm your password.");
  });

  it("should return error when passwords do not match", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password456",
    });
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("should not return error when passwords match", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "password123",
      confirmPassword: "password123",
    });
    expect(errors.confirmPassword).toBeUndefined();
  });

  // Multiple Error Scenarios
  it("should return multiple errors when multiple fields are invalid", () => {
    const errors = validateRegister({
      fullName: "",
      email: "invalid",
      password: "123",
      confirmPassword: "456",
    });
    expect(errors.fullName).toBe("Please enter your full name.");
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
    expect(errors.password).toBe("Password must be at least 6 characters.");
    expect(errors.confirmPassword).toBe("Passwords do not match.");
  });

  it("should return all errors when all fields are empty", () => {
    const errors = validateRegister({
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    });
    expect(errors.fullName).toBe("Please enter your full name.");
    expect(errors.email).toBe("Email is required.");
    expect(errors.password).toBe("Password is required.");
    expect(errors.confirmPassword).toBe("Please confirm your password.");
  });

  // Edge Cases
  it("should handle whitespace-only fullName as empty", () => {
    const errors = validateRegister({
      fullName: "   ",
      email: "john@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.fullName).toBeDefined();
  });

  it("should accept fullName with multiple words", () => {
    const errors = validateRegister({
      fullName: "John Michael Doe Jr.",
      email: "john@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.fullName).toBeUndefined();
  });

  it("should accept email with numbers", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "user123@test.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBeUndefined();
  });

  it("should accept email with dots and underscores", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "first.last_name@example.com",
      password: "password",
      confirmPassword: "password",
    });
    expect(errors.email).toBeUndefined();
  });

  it("should handle special characters in password", () => {
    const errors = validateRegister({
      fullName: "John Doe",
      email: "john@example.com",
      password: "P@ssw0rd!",
      confirmPassword: "P@ssw0rd!",
    });
    expect(errors.password).toBeUndefined();
    expect(errors.confirmPassword).toBeUndefined();
  });
});

describe("validateLogin", () => {
  // happy path
  it("should return no errors for valid input", () => {
    const errors = validateLogin({
      email: "john@example.com",
      password: "password123",
    });
    expect(errors).toEqual({});
  });

  // email validation
  it("should return error when email is missing", () => {
    const errors = validateLogin({
      email: "",
      password: "password",
    });
    expect(errors.email).toBe("Email is required.");
  });

  it("should return error when email format is invalid", () => {
    const errors = validateLogin({
      email: "invalid-email",
      password: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  it("should accept valid email with subdomain", () => {
    const errors = validateLogin({
      email: "test@mail.concordia.ca",
      password: "password",
    });
    expect(errors.email).toBeUndefined();
  });

  it("should reject email without @ symbol", () => {
    const errors = validateLogin({
      email: "testconcordia.ca",
      password: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  it("should reject email without domain", () => {
    const errors = validateLogin({
      email: "test@",
      password: "password",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
  });

  it("should accept email with dots and underscores", () => {
    const errors = validateLogin({
      email: "first.last_name@example.com",
      password: "password",
    });
    expect(errors.email).toBeUndefined();
  });

  // password validation
  it("should return error when password is missing", () => {
    const errors = validateLogin({
      email: "john@example.com",
      password: "",
    });
    expect(errors.password).toBe("Password is required.");
  });

  it("should accept any password length (no minimum check)", () => {
    const errors = validateLogin({
      email: "john@example.com",
      password: "12",
    });
    expect(errors.password).toBeUndefined();
  });

  // combination
  it("should return multiple errors when both fields are invalid", () => {
    const errors = validateLogin({
      email: "invalid",
      password: "",
    });
    expect(errors.email).toBe(
      "Please use an email in the format content@content.content",
    );
    expect(errors.password).toBe("Password is required.");
  });

  it("should return all errors when all fields are empty", () => {
    const errors = validateLogin({
      email: "",
      password: "",
    });
    expect(errors.email).toBe("Email is required.");
    expect(errors.password).toBe("Password is required.");
  });
});
