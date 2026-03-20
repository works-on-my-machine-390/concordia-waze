import SyncCalendarButton from "@/components/SyncGoogleCalendarButton";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import * as WebBrowser from "expo-web-browser";
import { Toast } from "toastify-react-native";
import {
  getGoogleAuthStatus,
  isAuthRequired,
} from "@/hooks/queries/googleAuthQueries";

jest.mock("expo-web-browser", () => ({
  openBrowserAsync: jest.fn(),
}));

jest.mock("@/hooks/queries/googleAuthQueries", () => ({
  getGoogleAuthStatus: jest.fn(),
  isAuthRequired: jest.fn(),
}));

describe("SyncCalendarButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("opens browser and shows info toast when auth is required", async () => {
    (getGoogleAuthStatus as jest.Mock).mockResolvedValue({
      url: "https://accounts.google.com/o/oauth2/auth",
    });
    (isAuthRequired as jest.Mock).mockReturnValue(true);

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
    (getGoogleAuthStatus as jest.Mock).mockResolvedValue({ ok: true });
    (isAuthRequired as jest.Mock).mockReturnValue(false);

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
    (getGoogleAuthStatus as jest.Mock).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveStatus = resolve;
        }),
    );
    (isAuthRequired as jest.Mock).mockReturnValue(false);

    const { getByRole } = render(<SyncCalendarButton onPress={jest.fn()} />);
    const button = getByRole("button");

    fireEvent.press(button);
    fireEvent.press(button);

    expect(getGoogleAuthStatus).toHaveBeenCalledTimes(1);

    resolveStatus?.({ ok: true });
    await waitFor(() => {
      expect(getGoogleAuthStatus).toHaveBeenCalledTimes(1);
    });
  });
});
