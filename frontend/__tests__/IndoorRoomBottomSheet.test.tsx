import { renderWithProviders } from "@/test_utils/renderUtils";
import { fireEvent } from "@testing-library/react-native";
import IndoorRoomBottomSheet from "../components/indoor/IndoorRoomBottomSheet";

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
    CloseIcon: () => <View testID="close-icon" />,
  };
});

describe("IndoorRoomBottomSheet", () => {
  test("formats room code with building code prefix", () => {
    const { getByText } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="Room 101" buildingCode="CC" roomType="room" onClose={jest.fn()} />,
    );
    expect(getByText("CC101")).toBeTruthy();
    expect(getByText("Room")).toBeTruthy();
  });

  test("handles non-room POI types by capitalizing them", () => {
    const { getByText, queryByText } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="poi_1" buildingCode="CC" roomType="bathroom" onClose={jest.fn()} />,
    );
    expect(getByText("Bathroom")).toBeTruthy();
    expect(queryByText("Room")).toBeNull();
  });

  test("strips 'Room' prefix from room code", () => {
    const { getByText: getText1 } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="Room 205" buildingCode="H" roomType="room" onClose={jest.fn()} />,
    );
    expect(getText1("H205")).toBeTruthy();

    const { getByText: getText2 } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="105" buildingCode="MB" roomType="room" onClose={jest.fn()} />,
    );
    expect(getText2("MB105")).toBeTruthy();
  });

  test("renders action buttons and calls onClose", () => {
    const mockOnClose = jest.fn();
    const { getByTestId } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="Room 101" buildingCode="CC" roomType="room" onClose={mockOnClose} />,
    );

    expect(getByTestId("directions-icon")).toBeTruthy();
    expect(getByTestId("favorite-icon")).toBeTruthy();

    const closeButton = getByTestId("indoor-room-close-button");
    fireEvent.press(closeButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  test("handles null/undefined roomType with fallback", () => {
    const { getByText: getText1 } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="poi_1" buildingCode="CC" roomType={null} onClose={jest.fn()} />,
    );
    expect(getText1("poi_1")).toBeTruthy();

    const { getByText: getText2 } = renderWithProviders(
      <IndoorRoomBottomSheet roomCode="poi_2" buildingCode="H" roomType={undefined} onClose={jest.fn()} />,
    );
    expect(getText2("poi_2")).toBeTruthy();
  });
});
