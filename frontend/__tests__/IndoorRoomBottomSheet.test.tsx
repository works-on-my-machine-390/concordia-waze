import { renderWithProviders } from "@/test_utils/renderUtils";
import {
  useCreateFavorite,
  useDeleteFavorite,
  useGetUserFavorites,
} from "@/hooks/queries/favoritesQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { fireEvent } from "@testing-library/react-native";
import IndoorRoomBottomSheet from "../components/indoor/IndoorRoomBottomSheet";

const createFavoriteMutate = jest.fn();
const deleteFavoriteMutate = jest.fn();

jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => (
      <View testID="bottom-sheet">{children}</View>
    ),
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

jest.mock("@/hooks/queries/favoritesQueries", () => ({
  useCreateFavorite: jest.fn(),
  useDeleteFavorite: jest.fn(),
  useGetUserFavorites: jest.fn(),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

const baseProps = {
  roomCode: "Room 101",
  buildingCode: "CC",
  floorNumber: 1,
  coordX: 0.12,
  coordY: 0.34,
  onClose: jest.fn(),
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
});

describe("IndoorRoomBottomSheet", () => {
  test("formats room code with building code prefix", () => {
    const { getByText } = renderWithProviders(
      <IndoorRoomBottomSheet {...baseProps} roomType="room" />,
    );
    expect(getByText("CC101")).toBeTruthy();
    expect(getByText("Room")).toBeTruthy();
  });

  test("handles non-room POI types by capitalizing them", () => {
    const { getByText, queryByText } = renderWithProviders(
      <IndoorRoomBottomSheet
        {...baseProps}
        roomCode="poi_1"
        roomType="bathroom"
      />,
    );
    expect(getByText("Bathroom")).toBeTruthy();
    expect(queryByText("Room")).toBeNull();
  });

  test("strips 'Room' prefix from room code", () => {
    const { getByText: getText1 } = renderWithProviders(
      <IndoorRoomBottomSheet
        {...baseProps}
        roomCode="Room 205"
        buildingCode="H"
        roomType="room"
      />,
    );
    expect(getText1("H205")).toBeTruthy();

    const { getByText: getText2 } = renderWithProviders(
      <IndoorRoomBottomSheet
        {...baseProps}
        roomCode="105"
        buildingCode="MB"
        roomType="room"
      />,
    );
    expect(getText2("MB105")).toBeTruthy();
  });

  test("renders action buttons and calls onClose", () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <IndoorRoomBottomSheet
        {...baseProps}
        roomType="room"
        onClose={mockOnClose}
      />,
    );

    expect(getByTestId("directions-icon")).toBeTruthy();
    expect(getByTestId("favorite-icon")).toBeTruthy();

    const closeButton = getByTestId("indoor-room-close-button");
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("handles null/undefined roomType with fallback", () => {
    const { getByText: getText1 } = renderWithProviders(
      <IndoorRoomBottomSheet {...baseProps} roomCode="poi_1" roomType={null} />,
    );
    expect(getText1("poi_1")).toBeTruthy();

    const { getByText: getText2 } = renderWithProviders(
      <IndoorRoomBottomSheet
        {...baseProps}
        roomCode="poi_2"
        buildingCode="H"
        roomType={undefined}
      />,
    );
    expect(getText2("poi_2")).toBeTruthy();
  });
});

test("calls onDirectionsPress and onClose when navigate button is pressed", () => {
  const mockOnClose = jest.fn();
  const mockOnDirectionsPress = jest.fn();

  const { getByTestId } = renderWithProviders(
    <IndoorRoomBottomSheet
      {...baseProps}
      roomCode="Room 101"
      buildingCode="CC"
      roomType="room"
      onClose={mockOnClose}
      onDirectionsPress={mockOnDirectionsPress}
    />,
  );

  fireEvent.press(getByTestId("indoor-room-navigate-button"));

  expect(mockOnDirectionsPress).toHaveBeenCalled();
  expect(mockOnClose).toHaveBeenCalled();
});

test("does not call handlers when directions are disabled", () => {
  const mockOnClose = jest.fn();
  const mockOnDirectionsPress = jest.fn();

  const { getByTestId } = renderWithProviders(
    <IndoorRoomBottomSheet
      {...baseProps}
      roomCode="Room 101"
      buildingCode="CC"
      roomType="room"
      onClose={mockOnClose}
      onDirectionsPress={mockOnDirectionsPress}
      directionsDisabled={true}
    />,
  );

  fireEvent.press(getByTestId("indoor-room-navigate-button"));

  expect(mockOnDirectionsPress).not.toHaveBeenCalled();
  expect(mockOnClose).not.toHaveBeenCalled();
});

test("only calls onClose when no onDirectionsPress is provided", () => {
  const mockOnClose = jest.fn();

  const { getByTestId } = renderWithProviders(
    <IndoorRoomBottomSheet
      {...baseProps}
      roomCode="Room 101"
      buildingCode="CC"
      roomType="room"
      onClose={mockOnClose}
    />,
  );

  fireEvent.press(getByTestId("indoor-room-navigate-button"));

  expect(mockOnClose).toHaveBeenCalled();
});

test("pressing favorite adds indoor favorite when not already present", () => {
  (useGetUserFavorites as jest.Mock).mockReturnValue({ data: [] });

  const { getByTestId } = renderWithProviders(
    <IndoorRoomBottomSheet {...baseProps} roomType="room" />,
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

test("pressing favorite removes indoor favorite when already present", () => {
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
    <IndoorRoomBottomSheet {...baseProps} roomType="room" />,
  );

  fireEvent.press(getByTestId("indoor-room-favorite-button"));

  expect(deleteFavoriteMutate).toHaveBeenCalledWith("fav-indoor-1");
  expect(createFavoriteMutate).not.toHaveBeenCalled();
});
