import Favorites from "@/app/(drawer)/favorites";
import { useGetAllBuildings } from "@/hooks/queries/buildingQueries";
import { useGetUserFavorites } from "@/hooks/queries/favoritesQueries";
import { useGetProfile } from "@/hooks/queries/userQueries";
import { fireEvent } from "@testing-library/react-native";
import { renderWithProviders } from "@/test_utils/renderUtils";

const mockPush = jest.fn();
const mockDispatch = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  DrawerActions: {
    openDrawer: () => ({ type: "OPEN_DRAWER" }),
  },
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
}));

jest.mock("@/hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

jest.mock("@/hooks/queries/favoritesQueries", () => ({
  useGetUserFavorites: jest.fn(),
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetAllBuildings: jest.fn(),
  CampusCode: {
    SGW: "SGW",
    LOY: "LOY",
  },
}));

describe("Favorites screen", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useGetProfile as jest.Mock).mockReturnValue({
      data: { id: "user-1" },
      isLoading: false,
    });

    (useGetAllBuildings as jest.Mock).mockReturnValue({
      data: {
        buildings: {
          SGW: [
            {
              name: "MB",
              long_name: "John Molson Building",
              code: "MB",
              campus: "SGW",
              address: "1450 Guy St",
              latitude: 45.497,
              longitude: -73.579,
            },
          ],
          LOY: [],
        },
      },
    });
  });

  test("navigates to indoor map with selected floor and coordinates when pressing indoor row", () => {
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-1",
          userId: "user-1",
          type: "indoor",
          name: "Room 210",
          buildingCode: "MB",
          floorNumber: 2,
          x: 0.31,
          y: 0.44,
          poiType: "room",
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByLabelText } = renderWithProviders(<Favorites />);

    fireEvent.press(getByLabelText("Open MB210"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-map",
      params: {
        buildingCode: "MB",
        selectedRoom: "Room 210",
        selectedFloor: "2",
      },
    });
  });

  test("navigates to outdoor map when pressing outdoor row", () => {
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-2",
          userId: "user-1",
          type: "outdoor",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByLabelText } = renderWithProviders(<Favorites />);

    fireEvent.press(getByLabelText("Open John Molson Building"));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        selected: "MB",
        campus: "SGW",
        camLat: "45.497",
        camLng: "-73.579",
      },
    });
  });

  test("search filters favorites list", () => {
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-1",
          userId: "user-1",
          type: "indoor",
          name: "Room 210",
          buildingCode: "MB",
          floorNumber: 2,
          x: 0.31,
          y: 0.44,
          poiType: "room",
        },
        {
          id: "fav-2",
          userId: "user-1",
          type: "outdoor",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
      ],
      isLoading: false,
      error: null,
    });

    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProviders(<Favorites />);

    expect(getByText("MB210")).toBeTruthy();
    expect(getByText("John Molson Building")).toBeTruthy();

    fireEvent.changeText(getByPlaceholderText("Search favorites"), "210");

    expect(getByText("MB210")).toBeTruthy();
    expect(queryByText("John Molson Building")).toBeNull();
  });

  test("does not render remove heart action in list", () => {
    (useGetUserFavorites as jest.Mock).mockReturnValue({
      data: [
        {
          id: "fav-1",
          userId: "user-1",
          type: "outdoor",
          name: "John Molson Building",
          latitude: 45.497,
          longitude: -73.579,
        },
      ],
      isLoading: false,
      error: null,
    });

    const { queryByLabelText } = renderWithProviders(<Favorites />);

    expect(
      queryByLabelText("Remove John Molson Building from favorites"),
    ).toBeNull();
  });
});
