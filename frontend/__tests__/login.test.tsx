import { fireEvent, render, waitFor } from "@testing-library/react-native";
import LoginScreen from "../app/login";

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockLogin = jest.fn();
const mockValidateLogin = jest.fn();
const mockRefetchQueries = jest.fn();
const mockToastSuccess = jest.fn();
let mockLoading = false;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    login: mockLogin,
    loading: mockLoading,
  }),
}));

jest.mock("../app/utils/validators", () => ({
  validateLogin: (payload: unknown) => mockValidateLogin(payload),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    refetchQueries: mockRefetchQueries,
  }),
}));

jest.mock("toastify-react-native", () => ({
  Toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
  },
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
        <Text>{label}</Text>
        <TextInput
          testID={rest.testID}
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
  return function MockAuthButton({ title, onPress }: any) {
    return (
      <Pressable testID="sign-in-button" onPress={onPress}>
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

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoading = false;
    mockValidateLogin.mockReturnValue({});
    mockLogin.mockResolvedValue({ success: true });
  });

  test("navigates to register when sign up link is pressed", () => {
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.press(getByTestId("signup-link"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/register",
      params: { prev: "login" },
    });
  });

  test("toggles password visibility", () => {
    const { getByTestId } = render(<LoginScreen />);

    const passwordInput = getByTestId("password-input-login");
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(getByTestId("password-toggle"));

    expect(getByTestId("password-input-login").props.secureTextEntry).toBe(
      false,
    );
  });

  test("does not submit when validation fails", () => {
    mockValidateLogin.mockReturnValue({ email: "Invalid email" });

    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("email-input-login"), "bad-email");
    fireEvent.changeText(getByTestId("password-input-login"), "password");
    fireEvent.press(getByTestId("sign-in-button"));

    expect(mockValidateLogin).toHaveBeenCalledWith({
      email: "bad-email",
      password: "password",
    });
    expect(mockLogin).not.toHaveBeenCalled();
    expect(getByText("Invalid email")).toBeTruthy();
  });

  test("submits valid credentials and handles success flow", async () => {
    const { getByTestId } = render(<LoginScreen />);

    fireEvent.changeText(
      getByTestId("email-input-login"),
      " USER@LIVE.CONCORDIA.CA ",
    );
    fireEvent.changeText(getByTestId("password-input-login"), "Secret123");
    fireEvent.press(getByTestId("sign-in-button"));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith("user@live.concordia.ca", "Secret123");
    });

    expect(mockReplace).toHaveBeenCalledWith("/map");
    expect(mockRefetchQueries).toHaveBeenCalledWith({
      queryKey: ["auth", "isAuthenticated"],
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("Login successful!");
  });

  test("shows server error and clears password on failed login", async () => {
    mockLogin.mockResolvedValue({ success: false, error: "Invalid credentials" });

    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId("email-input-login"), "user@live.concordia.ca");
    fireEvent.changeText(getByTestId("password-input-login"), "Secret123");
    fireEvent.press(getByTestId("sign-in-button"));

    await waitFor(() => {
      expect(getByText("Invalid credentials")).toBeTruthy();
    });

    expect(getByTestId("password-input-login").props.value).toBe("");
  });
});