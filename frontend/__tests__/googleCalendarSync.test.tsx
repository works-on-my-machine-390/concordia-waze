import GoogleSyncPage from "@/app/googleCalendarSync";
import { fireEvent, render, waitFor } from "@testing-library/react-native";

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockInvalidateQueries = jest.fn();
const mockMutate = jest.fn();
const mockReset = jest.fn();

const mutationState = {
  isPending: false,
  isSuccess: false,
};
let mockSuccessHandled = false;

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
  useMutation: ({ onSuccess }: { onSuccess?: () => void }) => {
    if (mutationState.isSuccess && !mockSuccessHandled) {
      mockSuccessHandled = true;
      onSuccess?.();
    }
    return {
      isPending: mutationState.isPending,
      isSuccess: mutationState.isSuccess,
      mutate: (...args: unknown[]) => {
        mockMutate(...args);
      },
      reset: mockReset,
    };
  },
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  syncCourses: jest.fn(),
}));

jest.mock("react-native-progress", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    Bar: ({ progress }: { progress: number }) => (
      <View testID="progress" accessibilityLabel={`progress-${progress}`} />
    ),
  };
});

describe("GoogleSyncPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mutationState.isPending = false;
    mutationState.isSuccess = false;
    mockSuccessHandled = false;
    jest.useRealTimers();
  });

  test("starts sync on mount when idle", () => {
    render(<GoogleSyncPage />);

    expect(mockMutate).toHaveBeenCalledWith(undefined);
  });

  test("shows success text and redirects to schedule after sync success", async () => {
    jest.useFakeTimers();
    mutationState.isSuccess = true;

    const { getByText } = render(<GoogleSyncPage />);

    expect(getByText("Sync Complete!")).toBeTruthy();

    await waitFor(() => {
      expect(mockInvalidateQueries).toHaveBeenCalledWith({
        queryKey: ["courses"],
      });
    });

    jest.advanceTimersByTime(1500);

    expect(mockPush).toHaveBeenCalledWith("/(drawer)/schedule");
  });

  test("cancel sync resets mutation and navigates back", () => {
    const { getByText } = render(<GoogleSyncPage />);

    fireEvent.press(getByText("Cancel Sync"));

    expect(mockReset).toHaveBeenCalled();
    expect(mockBack).toHaveBeenCalled();
  });
});
