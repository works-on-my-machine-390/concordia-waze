import Schedule from "@/app/(drawer)/schedule";
import { fireEvent, waitFor } from "@testing-library/react-native";
import { renderWithProviders } from "@/test_utils/renderUtils";

const mockRouterPush = jest.fn();
const mockUseCourses = jest.fn();
const mockGetGuestCourses = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
  useFocusEffect: (callback: () => void) => callback(),
}));

jest.mock("@/hooks/queries/googleCalendarQueries", () => ({
  useCourses: () => mockUseCourses(),
}));

jest.mock("@/hooks/guestStorage", () => ({
  getGuestCourses: () => mockGetGuestCourses(),
}));

jest.mock("@/components/classes/ClassInfoCard", () => {
  return ({ courseName, classInfo }: { courseName: string; classInfo: { type: string } }) => {
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

  test("renders both guest and synced course cards", async () => {
    const { getByText } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(getByText("COMP 346-LAB")).toBeTruthy();
      expect(getByText("SOEN 341-LEC")).toBeTruthy();
    });
  });

  test("navigates to add-class when add icon is pressed", async () => {
    const { getByText } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    fireEvent.press(getByText(""));

    expect(mockRouterPush).toHaveBeenCalledWith({
      pathname: "/add-class",
      params: { prev: "schedule" },
    });
  });

  test("navigates to google sync page when sync button is pressed", async () => {
    const { getByTestId } = renderWithProviders(<Schedule />);

    await waitFor(() => {
      expect(mockGetGuestCourses).toHaveBeenCalled();
    });

    fireEvent.press(getByTestId("sync-button"));

    expect(mockRouterPush).toHaveBeenCalledWith("/googleCalendarSync");
  });
});
