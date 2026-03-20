import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { Toast } from "toastify-react-native";
import {
  getGoogleAuthStatus,
  isAuthRequired,
} from "@/hooks/queries/googleAuthQueries";
import { useAuth } from "@/hooks/useAuth";

const mockGetGoogleAuthStatus =
  getGoogleAuthStatus as jest.MockedFunction<typeof getGoogleAuthStatus>;
const mockIsAuthRequired =
  isAuthRequired as jest.MockedFunction<typeof isAuthRequired>;
const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;

const buildUseAuthMock = (
  checkTokenValue: boolean,
): ReturnType<typeof useAuth> => ({
  login: jest.fn().mockResolvedValue({ success: true }),
  register: jest.fn().mockResolvedValue({ success: true }),
  logout: jest.fn().mockResolvedValue(undefined),
  loading: false,
  loggedIn: checkTokenValue,
  checkToken: jest.fn().mockResolvedValue(checkTokenValue),
});

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock("@/hooks/queries/googleAuthQueries", () => ({
  getGoogleAuthStatus: jest.fn(),
  isAuthRequired: jest.fn(),
}));

jest.mock("@/hooks/useAuth", () => ({
  useAuth: jest.fn(),
}));

describe("SyncCalendarButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue(buildUseAuthMock(true));
  });

  test("shows login toast and skips Google auth flow for guest users", async () => {
    mockUseAuth.mockReturnValue(buildUseAuthMock(false));

    const onPress = jest.fn();
    const { getByText } = render(<SyncCalendarButton onPress={onPress} />);

    fireEvent.press(getByText("Sync Calendar"));

    await waitFor(() => {
      expect(Toast.info).toHaveBeenCalledWith("You must login to sync calendar.");
    });

    expect(getGoogleAuthStatus).not.toHaveBeenCalled();
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    expect(onPress).not.toHaveBeenCalled();
  });

  test("opens browser and shows info toast when auth is required", async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({
      url: "https://accounts.google.com/o/oauth2/auth",
    });
    mockIsAuthRequired.mockReturnValue(true);

    const onPress = jest.fn();
    const { getByText } = render(<SyncCalendarButton onPress={onPress} />);

    fireEvent.press(getByText("Sync Calendar"));

    await waitFor(() => {
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        "https://accounts.google.com/o/oauth2/auth",
      );
    });

    expect(Toast.info).toHaveBeenCalledWith(
      "Finish Google authentication in browser, then tap sync again.",
    );
    expect(onPress).not.toHaveBeenCalled();
  });

  test("calls onPress when auth is already connected", async () => {
    mockGetGoogleAuthStatus.mockResolvedValue({ ok: true });
    mockIsAuthRequired.mockReturnValue(false);

    const onPress = jest.fn().mockResolvedValue(undefined);
    const { getByText } = render(<SyncCalendarButton onPress={onPress} />);

    fireEvent.press(getByText("Sync Calendar"));

    await waitFor(() => {
      expect(onPress).toHaveBeenCalled();
    });
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });

  test("prevents duplicate presses while loading", async () => {
    let resolveStatus: ((value: { ok: true }) => void) | undefined;
    mockGetGoogleAuthStatus.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve;
        }),
    );
    mockIsAuthRequired.mockReturnValue(false);

    const { getByRole } = render(<SyncCalendarButton onPress={jest.fn()} />);
    const button = getByRole("button");

    fireEvent.press(button);
    fireEvent.press(button);

    await waitFor(() => {
      expect(getGoogleAuthStatus).toHaveBeenCalledTimes(1);
    });

    resolveStatus?.({ ok: true });
    await waitFor(() => {
      expect(getGoogleAuthStatus).toHaveBeenCalledTimes(1);
    });
  });
});
