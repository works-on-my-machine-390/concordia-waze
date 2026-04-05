import { renderWithProviders } from "@/test_utils/renderUtils";
import {
  useCreateFavorite,
  useDeleteFavorite,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { NavigationPhase, useNavigationStore } from "@/hooks/useNavigationStore";
import { fireEvent, waitFor } from "@testing-library/react-native";
import IndoorRoomBottomSheet from "../components/indoor/IndoorRoomBottomSheet";

const createFavoriteMutate = jest.fn();
const deleteFavoriteMutate = jest.fn();
const mockFindAndSetStartLocation = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({
    buildingCode: "CC",
    selectedFloor: "1",
  }),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="bottom-sheet">{children}</View>,
  };
});

jest.mock("@/app/icons", () => {
  const { View } = require("react-native");
  return {
    GetDirectionsIcon: () => <View testID="directions-icon" />,
    FavoriteEmptyIcon: () => <View testID="favorite-icon" />,
    FavoriteFilledIcon: () => <View testID="favorite-filled-icon" />,
    CloseIcon: () => <View testID="close-icon" />,
  };
});

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    findAndSetStartLocation: mockFindAndSetStartLocation,
  }),
}));

jest.mock("@/hooks/queries/favoritesQueries", () => ({
  useCreateFavorite: jest.fn(),
  useDeleteFavorite: jest.fn(),
  useGetUserFavorites: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

const selectedPoi = {
  name: "Room 101",
  type: "room",
  position: { x: 0.12, y: 0.34 },
  polygon: [],
};

beforeEach(() => {
  jest.clearAllMocks();
  (useGetProfile as jest.Mock).mockReturnValue({ data: { id: "user-1" } });
  (useCreateFavorite as jest.Mock).mockReturnValue({
    mutate: createFavoriteMutate,
  });
  (useDeleteFavorite as jest.Mock).mockReturnValue({
    mutate: deleteFavoriteMutate,
  });
  (useGetUserFavorites as jest.Mock).mockReturnValue({ data: [] });

  useMapStore.setState({ currentMode: MapMode.NONE });
  useNavigationStore.setState({
    startLocation: undefined,
    endLocation: undefined,
    navigationPhase: undefined,
  });
});

describe("IndoorRoomBottomSheet", () => {
  test("renders formatted room title and room subtitle", () => {
    const { getByText } = renderWithProviders(
      <IndoorRoomBottomSheet selectedPoi={selectedPoi as any} onClose={jest.fn()} />,
    );

    expect(getByText("CC101")).toBeTruthy();
    expect(getByText("Room")).toBeTruthy();
  });

  test("navigate button sets end location and enters preparation phase", async () => {
    const onClose = jest.fn();

    const { getByTestId } = renderWithProviders(
      <IndoorRoomBottomSheet selectedPoi={selectedPoi as any} onClose={onClose} />,
    );

    fireEvent.press(getByTestId("indoor-room-navigate-button"));

    await waitFor(() => {
      expect(useMapStore.getState().currentMode).toBe(MapMode.NAVIGATION);
      expect(useNavigationStore.getState().navigationPhase).toBe(
        NavigationPhase.PREPARATION,
      );
      expect(useNavigationStore.getState().endLocation?.name).toBe("CC101");
      expect(onClose).toHaveBeenCalled();
    });
  });

  test("favorite button adds indoor favorite when not favorited", () => {
    const { getByTestId } = renderWithProviders(
      <IndoorRoomBottomSheet selectedPoi={selectedPoi as any} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId("indoor-room-favorite-button"));

    expect(createFavoriteMutate).toHaveBeenCalledWith({
      type: "indoor",
      name: "Room 101",
      buildingCode: "CC",
      floorNumber: 1,
      x: 0.12,
      y: 0.34,
      poiType: "room",
    });
    expect(deleteFavoriteMutate).not.toHaveBeenCalled();
  });

  test("favorite button removes indoor favorite when already favorited", () => {
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-indoor-1",
          type: "indoor",
          buildingCode: "CC",
          floorNumber: 1,
          x: 0.12,
          y: 0.34,
        },
      ],
    });

    const { getByTestId } = renderWithProviders(
      <IndoorRoomBottomSheet selectedPoi={selectedPoi as any} onClose={jest.fn()} />,
    );

    fireEvent.press(getByTestId("indoor-room-favorite-button"));

    expect(deleteFavoriteMutate).toHaveBeenCalledWith("fav-indoor-1");
    expect(createFavoriteMutate).not.toHaveBeenCalled();
  });
});
