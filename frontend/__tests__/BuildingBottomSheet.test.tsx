import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";
import {
  useCreateFavorite,
  useDeleteFavorite,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useSaveToHistory } from "@/hooks/queries/userHistoryQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { fireEvent, waitFor } from "@testing-library/react-native";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import { MapMode, useMapStore } from "../hooks/useMapStore";
import { useNavigationStore } from "../hooks/useNavigationStore";
import { renderWithProviders } from "../test_utils/renderUtils";

jest.mock("react-native-gesture-handler", () => {
  return {
    GestureHandlerRootView: ({ children }: any) => <>{children}</>,
    ScrollView: ({ children }: any) => <>{children}</>,
    Swipeable: ({ children }: any) => <>{children}</>,
    PanGestureHandler: ({ children }: any) => <>{children}</>,
    State: {},
    Directions: {},
  };
});

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildingDetails: jest.fn(),
  CampusCode: {
    SGW: "SGW",
    LOY: "LOY",
  },
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

jest.mock("@/hooks/queries/userHistoryQueries", () => ({
  useSaveToHistory: jest.fn(),
}));

jest.mock("@/hooks/queries/favoritesQueries", () => ({
  useCreateFavorite: jest.fn(),
  useDeleteFavorite: jest.fn(),
  useGetUserFavorites: jest.fn(),
}));

jest.mock("@/app/utils/mapUtils", () => ({
  getAddressFromLocation: jest
    .fn()
    .mockResolvedValue("1455 De Maisonneuve Blvd W"),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: React.forwardRef(({ children, onChange }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({ snapToIndex: jest.fn() }));
      return (
        <View testID="bottom-sheet" onLayout={() => onChange?.(1)}>
          {children}
        </View>
      );
    }),
    BottomSheetScrollView: ({ children }: any) => <View>{children}</View>,
  };
});

jest.mock("../app/icons", () => {
  const { View } = require("react-native");
  return {
    CloseIcon: () => <View testID="close-icon" />,
    ElevatorIcon: () => <View testID="elevator-icon" />,
    FavoriteEmptyIcon: () => <View testID="favorite-icon" />,
    FavoriteFilledIcon: () => <View testID="favorite-filled-icon" />,
    GetDirectionsIcon: () => <View testID="get-directions-icon" />,
    WheelchairIcon: () => <View testID="wheelchair-icon" />,
    SlopeUpIcon: () => <View testID="slope-up-icon" />,
  };
});

jest.mock("../components/BuildingGallery", () => {
  const { View } = require("react-native");
  return function MockBuildingGallery() {
    return <View testID="building-gallery" />;
  };
});

jest.mock("../components/BottomSheetListSection", () => {
  const { View, Text } = require("react-native");
  return function MockListSection({ title, items }: any) {
    return (
      <View>
        <Text>{title}</Text>
        {items?.map((item: string) => (
          <Text key={item}>{item}</Text>
        ))}
      </View>
    );
  };
});

jest.mock("../components/OpeningHours", () => {
  const { View } = require("react-native");
  return function MockOpeningHours() {
    return <View testID="opening-hours" />;
  };
});

jest.mock("../assets/images/icon-dizzy.png", () => "icon-dizzy");

const mockBuilding = {
  code: "MB",
  long_name: "John Molson Building",
  address: "1450 Guy St, Montreal",
  latitude: 45.497,
  longitude: -73.579,
  opening_hours: [],
  services: ["Career Management Service", "First Stop"],
  departments: ["Accountancy", "Finance"],
  venues: ["Cafe", "Library"],
  accessibility: ["Accessible entrance", "Accessible building elevator"],
  metro_accessible: false,
};

function resetStores() {
  useMapStore.setState({
    userLocation: undefined,
    selectedBuildingCode: undefined,
    currentBuildingCode: undefined,
    currentMode: MapMode.NONE,
  });

  useNavigationStore.setState({
    startLocation: undefined,
    endLocation: undefined,
  });
}

describe("BuildingBottomSheet", () => {
  const createFavoriteMutate = jest.fn();
  const deleteFavoriteMutate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    resetStores();

    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useSaveToHistory as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useCreateFavorite as jest.Mock).mockReturnValue({
      mutate: createFavoriteMutate,
    });
    (useDeleteFavorite as jest.Mock).mockReturnValue({
      mutate: deleteFavoriteMutate,
    });
    (useGetUserFavorites as jest.Mock).mockReturnValue({ data: [] });
  });

  test("renders empty state when no building data is available", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: null,
      isSuccess: false,
      isLoading: false,
    });

    const { getByText } = renderWithProviders(<BuildingBottomSheet />);

    expect(
      getByText("No information available for this building"),
    ).toBeTruthy();
  });

  test("renders building details and sections when data loads", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });

    const { getByText, getByTestId } = renderWithProviders(
      <BuildingBottomSheet />,
    );

    expect(getByText("John Molson Building (MB)")).toBeTruthy();
    expect(getByText("1450 Guy St, Montreal")).toBeTruthy();
    expect(getByTestId("building-gallery")).toBeTruthy();
    expect(getByText("Services")).toBeTruthy();
    expect(getByText("Career Management Service")).toBeTruthy();
    expect(getByText("Departments")).toBeTruthy();
    expect(getByText("Venues")).toBeTruthy();
  });

  test("renders mapped accessibility icons", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });

    const { getByTestId, queryByTestId } = renderWithProviders(
      <BuildingBottomSheet />,
    );

    expect(getByTestId("wheelchair-icon")).toBeTruthy();
    expect(getByTestId("elevator-icon")).toBeTruthy();
    expect(queryByTestId("slope-up-icon")).toBeNull();
  });

  test("pressing close clears selected building and closes sheet mode", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");
    useMapStore.getState().setCurrentMode(MapMode.BUILDING);

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(<BuildingBottomSheet />);

    fireEvent.press(getByTestId("close-icon").parent as any);

    expect(useMapStore.getState().selectedBuildingCode).toBeUndefined();
    expect(useMapStore.getState().currentMode).toBe(MapMode.NONE);
  });

  test("pressing start navigation sets end location and navigation mode", async () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });

    const { getByTestId } = renderWithProviders(<BuildingBottomSheet />);

    fireEvent.press(getByTestId("start-navigation"));

    await waitFor(() => {
      expect(useMapStore.getState().currentMode).toBe(MapMode.NAVIGATION);
      expect(useNavigationStore.getState().endLocation?.code).toBe("MB");
      expect(useNavigationStore.getState().endLocation?.name).toBe(
        "John Molson Building",
      );
    });
  });

  test("pressing favorite adds building when not already favorited", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });
    (useGetUserFavorites as jest.Mock).mockReturnValue({ data: [] });

    const { getByTestId } = renderWithProviders(<BuildingBottomSheet />);

    fireEvent.press(getByTestId("building-favorite-button"));

    expect(createFavoriteMutate).toHaveBeenCalledWith({
      type: "outdoor",
      name: "John Molson Building",
      latitude: 45.497,
      longitude: -73.579,
    });
    expect(deleteFavoriteMutate).not.toHaveBeenCalled();
  });

  test("pressing favorite removes building when already favorited", () => {
    useMapStore.getState().setSelectedBuildingCode("MB");

    (useGetBuildingDetails as jest.Mock).mockReturnValue({
      data: mockBuilding,
      isSuccess: true,
      isLoading: false,
    });
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-123",
          type: "outdoor",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
      ],
    });

    const { getByTestId } = renderWithProviders(<BuildingBottomSheet />);

    fireEvent.press(getByTestId("building-favorite-button"));

    expect(deleteFavoriteMutate).toHaveBeenCalledWith("fav-123");
    expect(createFavoriteMutate).not.toHaveBeenCalled();
  });
});
