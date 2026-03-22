import Schedule from "@/app/(drawer)/schedule";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test_utils/renderUtils";

const mockRouterPush = jest.fn();
const mockUseCourses = jest.fn();
const mockGetGuestCourses = jest.fn();
const mockDispatch = jest.fn();
const mockUseGetProfile = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
  DrawerActions: {
    openDrawer: () => ({ type: "OPEN_DRAWER" }),
  },
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");

  const MockBottomSheet = React.forwardRef(({ children }: any, ref: any) => (
    <View ref={ref} testID="bottom-sheet">
      {children}
    </View>
  ));

  return {
    __esModule: true,
    default: MockBottomSheet,
    BottomSheetScrollView: ({ children, ...props }: any) => (
      <ScrollView {...props}>{children}</ScrollView>
    ),
  };
});

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: () => mockUseCourses(),
}));

jest.mock("@/hooks/guestStorage", () => ({
  getGuestCourses: () => mockGetGuestCourses(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: () => mockUseGetProfile(),
}));

jest.mock("@/components/schedule/ScheduleClassCard", () => {
  return ({
    courseName,
    classInfo,
  }: {
    courseName: string;
    classInfo: { type: string };
  }) => {
    const { Text, View } = require("react-native");
    return (
      <View>
        <Text>{`${courseName}-${classInfo.type}`}</Text>
      </View>
    );
  };
});

jest.mock("@/components/SyncGoogleCalendarButton", () => {
  return ({ onPress }: { onPress?: () => void }) => {
    const { TouchableOpacity, Text } = require("react-native");
    return (
      <TouchableOpacity testID="sync-button" onPress={onPress}>
        <Text>Sync Calendar</Text>
      </TouchableOpacity>
    );
  };
});

jest.mock("@/components/schedule/WeeklyScheduleView", () => {
  return () => null;
});

describe("Schedule screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseCourses.mockReturnValue({
      data: [
        {
          name: "SOEN 341",
          classes: [
            {
              type: "LEC",
              section: "AA",
              day: "MON",
              startTime: "10:00",
              endTime: "11:15",
              buildingCode: "H",
              room: "110",
            },
          ],
        },
      ],
    });

    mockGetGuestCourses.mockResolvedValue([
      {
        name: "COMP 346",
        classes: [
          {
            type: "LAB",
            section: "BB",
            day: "TUE",
            startTime: "13:00",
            endTime: "15:00",
            buildingCode: "MB",
            room: "2.130",
          },
        ],
      },
    ]);
  });

  test("renders only synced course cards when user is logged in", async () => {
    mockUseGetProfile.mockReturnValue({
      data: { id: "user-123", name: "Test User" },
    });

    const { getByText, queryByText } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(getByText("SOEN 341-Lecture")).toBeTruthy();
    });

    expect(queryByText("COMP 346-Lab")).toBeNull();
  });

  test("renders only guest course cards when user is not logged in", async () => {
    mockUseGetProfile.mockReturnValue({
      data: null,
    });

    const { getByText, queryByText } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(getByText("COMP 346-Lab")).toBeTruthy();
    });

    expect(queryByText("SOEN 341-Lecture")).toBeNull();
  });

  test("opens drawer when menu button is pressed", async () => {
    mockUseGetProfile.mockReturnValue({
      data: null,
    });

    const { getByTestId } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("schedule-menu-button"));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "OPEN_DRAWER" });
  });

  test("navigates to add-class when add button is pressed", async () => {
    mockUseGetProfile.mockReturnValue({
      data: null,
    });

    const { getByTestId } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("add-class-button"));

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/add-class",
      params: { prev: "schedule" },
    });
  });

  test("navigates to google sync page when sync button is pressed", async () => {
    mockUseGetProfile.mockReturnValue({
      data: null,
    });

    const { getByTestId } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("sync-button"));

    expect(mockRouterPush).toHaveBeenCalledWith("/googleCalendarSync");
  });

  test("renders bottom sheet container", async () => {
    mockUseGetProfile.mockReturnValue({
      data: null,
    });

    const { getByTestId } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    expect(getByTestId("bottom-sheet")).toBeTruthy();
  });
});