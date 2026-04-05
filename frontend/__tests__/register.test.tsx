import { fireEvent, render, waitFor } from "@testing-library/react-native";
import RegisterScreen from "../app/register";

const mockPush = jest.fn();
const mockRegister = jest.fn();
const mockValidateRegister = jest.fn();
let mockLoading = false;

const mockEyeHidingIcon = jest.fn((props: unknown) => null);
const mockEyeShowingIcon = jest.fn((props: unknown) => null);

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    register: mockRegister,
    loading: mockLoading,
  }),
}));

jest.mock("../app/utils/validators", () => ({
  validateRegister: (payload: unknown) => mockValidateRegister(payload),
}));

jest.mock("../app/icons", () => ({
  EyeHidingIcon: (props: unknown) => mockEyeHidingIcon(props),
  EyeShowingIcon: (props: unknown) => mockEyeShowingIcon(props),
}));

jest.mock("../components/AuthLayout", () => {
  const { View, Text } = require("react-native");
  return function MockAuthLayout({ title, children }: any) {
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  };
});

jest.mock("../components/AuthInput", () => {
  const { View, Text, TextInput } = require("react-native");
  return function MockAuthInput({ label, error, right, onChange, ...rest }: any) {
    return (
      <View>
        {typeof label === "string" ? <Text>{label}</Text> : label}
        <TextInput
          testID={rest.testID ?? rest.placeholder}
          value={rest.value}
          onChangeText={onChange}
          secureTextEntry={rest.secureTextEntry}
          placeholder={rest.placeholder}
        />
        {error ? <Text>{error}</Text> : null}
        {right}
      </View>
    );
  };
});

jest.mock("../components/AuthButton", () => {
  const { Pressable, Text } = require("react-native");
  return function MockAuthButton({ title, onPress, testID }: any) {
    return (
      <Pressable testID={testID ?? "auth-button"} onPress={onPress}>
        <Text>{title}</Text>
      </Pressable>
    );
  };
});

jest.mock("../components/PasswordToggle", () => {
  const { Pressable, Text } = require("react-native");
  return function MockPasswordToggle({ onPress, show }: any) {
    return (
      <Pressable testID="password-toggle" onPress={onPress}>
        <Text>{show ? "hide" : "show"}</Text>
      </Pressable>
    );
  };
});

jest.mock("../components/TermsText", () => {
  const { Text } = require("react-native");
  return {
    TermsText: () => <Text>Terms</Text>,
  };
});

describe("RegisterScreen", () => {
  const originalAlert = (global as any).alert;
  const mockAlert = jest.fn();

  beforeAll(() => {
    (global as any).alert = mockAlert;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockValidateRegister.mockReturnValue({});
    mockRegister.mockResolvedValue({ success: true });
  });

  afterAll(() => {
    (global as any).alert = originalAlert;
  });

  test("navigates to login when footer sign in is pressed", () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText("Sign in"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { prev: "register" },
    });
  });

  test("shows password length helper when password is too short", () => {
    const { getByTestId, getByText, queryByText } = render(<RegisterScreen />);

    expect(
      queryByText("Must be at least 6 characters"),
    ).toBeNull();

    fireEvent.changeText(getByTestId("password-input"), "12345");
    expect(getByText("Must be at least 6 characters")).toBeTruthy();

    fireEvent.changeText(getByTestId("password-input"), "123456");
    expect(
      queryByText("Must be at least 6 characters"),
    ).toBeNull();
  });

  test("does not submit when validation fails", () => {
    mockValidateRegister.mockReturnValue({ email: "Invalid email" });

    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("fullname-input"), "John Doe");
    fireEvent.changeText(getByTestId("email-input"), "bad-email");
    fireEvent.changeText(getByTestId("password-input"), "123456");
    fireEvent.changeText(getByTestId("Password"), "123456");
    fireEvent.press(getByTestId("signup-button"));

    expect(mockRegister).not.toHaveBeenCalled();
    expect(getByText("Invalid email")).toBeTruthy();
  });

  test("submits valid registration and redirects on success", async () => {
    const { getByTestId } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("fullname-input"), "John Doe");
    fireEvent.changeText(getByTestId("email-input"), " USER@LIVE.CONCORDIA.CA ");
    fireEvent.changeText(getByTestId("password-input"), "Secret123");
    fireEvent.changeText(getByTestId("Password"), "Secret123");
    fireEvent.press(getByTestId("signup-button"));

    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith(
        "John Doe",
        "user@live.concordia.ca",
        "Secret123",
      );
    });

    expect(mockAlert).toHaveBeenCalledWith("Registration successful! Please log in.");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/login",
      params: { prev: "register" },
    });
  });

  test("shows server error when registration fails", async () => {
    mockRegister.mockResolvedValue({ success: false, error: "Email already used" });

    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId("fullname-input"), "John Doe");
    fireEvent.changeText(getByTestId("email-input"), "user@live.concordia.ca");
    fireEvent.changeText(getByTestId("password-input"), "Secret123");
    fireEvent.changeText(getByTestId("Password"), "Secret123");
    fireEvent.press(getByTestId("signup-button"));

    await waitFor(() => {
      expect(getByText("Email already used")).toBeTruthy();
    });
  });
});