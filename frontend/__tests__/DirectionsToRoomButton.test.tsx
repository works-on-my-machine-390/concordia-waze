import { fireEvent, render } from "@testing-library/react-native";
import { Text } from "react-native";
import DirectionsToRoomButton from "../components/classes/DirectionsToRoomButton";

const mockUseGetRoomLocation = jest.fn();
const mockSetCurrentMode = jest.fn();
const mockSetEndLocation = jest.fn();
const mockSetNavigationPhase = jest.fn();
const mockFindAndSetStartLocation = jest.fn();
const mockToastWarn = jest.fn();

jest.mock("@/hooks/queries/roomQueries", () => ({
  useGetRoomLocation: (...args: any[]) => mockUseGetRoomLocation(...args),
}));

jest.mock("@/hooks/useMapStore", () => ({
  MapMode: {
    NAVIGATION: "NAVIGATION",
  },
  useMapStore: (selector: any) =>
    selector({
      setCurrentMode: mockSetCurrentMode,
    }),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  NavigationPhase: {
    PREPARATION: "PREPARATION",
  },
  useNavigationStore: () => ({
    setEndLocation: mockSetEndLocation,
    setNavigationPhase: mockSetNavigationPhase,
  }),
}));

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    findAndSetStartLocation: mockFindAndSetStartLocation,
  }),
}));

jest.mock("@/app/icons", () => ({
  GetDirectionsIcon: () => {
    const { Text: RNText } = require("react-native");
    return <RNText>directions-icon</RNText>;
  },
}));

jest.mock("toastify-react-native", () => ({
  Toast: {
    warn: (...args: any[]) => mockToastWarn(...args),
  },
}));

describe("DirectionsToRoomButton", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseGetRoomLocation.mockReturnValue({ data: undefined });
  });

  test("renders custom component when provided", () => {
    const { getByText, queryByText } = render(
      <DirectionsToRoomButton
        target={{ buildingCode: "MB", roomCode: "210" }}
        component={<Text>custom-directions</Text>}
      />,
    );

    expect(getByText("custom-directions")).toBeTruthy();
    expect(queryByText("directions-icon")).toBeNull();
  });

  test("renders default directions icon when custom component is not provided", () => {
    const { getByText } = render(
      <DirectionsToRoomButton
        target={{ buildingCode: "MB", roomCode: "210" }}
      />,
    );

    expect(getByText("directions-icon")).toBeTruthy();
  });

  test("navigates to indoor room when room geometry is available", () => {
    const safeSearchResponse = {
      label: "MB S2.210",
      room: {
        centroid: {
          x: 0.25,
          y: 0.75,
        },
        floor: -2,
        geometryType: "polygon",
      },
      building_code: "MB",
      building_latitude: 45.495,
      building_longitude: -73.579,
      fallback_to_building: false,
    };

    mockUseGetRoomLocation.mockReturnValue({ data: safeSearchResponse });

    const { getByText } = render(
      <DirectionsToRoomButton
        target={{ buildingCode: "MB", roomCode: "S2.210" }}
      />,
    );

    fireEvent.press(getByText("directions-icon"));

    expect(mockSetEndLocation).toHaveBeenCalledWith({
      latitude: 45.495,
      longitude: -73.579,
      code: "MB",
      building: "MB",
      name: "MB S2.210",
      floor_number: -2,
      indoor_position: {
        x: 0.25,
        y: 0.75,
      },
    });
    expect(mockFindAndSetStartLocation).toHaveBeenCalledWith({
      latitude: 45.495,
      longitude: -73.579,
      code: "MB",
      building: "MB",
      name: "MB S2.210",
      floor_number: -2,
      indoor_position: {
        x: 0.25,
        y: 0.75,
      },
    });
    expect(mockSetCurrentMode).toHaveBeenCalledWith("NAVIGATION");
    expect(mockSetNavigationPhase).toHaveBeenCalledWith("PREPARATION");
    expect(mockToastWarn).not.toHaveBeenCalled();
  });

  test("falls back to building location when room is not mapped", () => {
    const safeSearchResponse = {
      label: "John Molson Building",
      building_code: "MB",
      building_latitude: 45.495,
      building_longitude: -73.579,
      fallback_to_building: true,
      reason: "ROOM_NOT_FOUND",
    };

    mockUseGetRoomLocation.mockReturnValue({ data: safeSearchResponse });

    const { getByText } = render(
      <DirectionsToRoomButton
        target={{ buildingCode: "MB", roomCode: "S9.999" }}
      />,
    );

    fireEvent.press(getByText("directions-icon"));

    expect(mockToastWarn).toHaveBeenCalledWith(
      "Room location data is not available, defaulting to building location.",
    );
    expect(mockSetEndLocation).toHaveBeenCalledWith({
      latitude: 45.495,
      longitude: -73.579,
      code: "MB",
      name: "John Molson Building",
    });
    expect(mockFindAndSetStartLocation).toHaveBeenCalledWith({
      latitude: 45.495,
      longitude: -73.579,
      code: "MB",
      name: "John Molson Building",
    });
    expect(mockSetCurrentMode).toHaveBeenCalledWith("NAVIGATION");
    expect(mockSetNavigationPhase).toHaveBeenCalledWith("PREPARATION");
  });

  test("shows warning and does not navigate when room data is unavailable", () => {
    mockUseGetRoomLocation.mockReturnValue({ data: undefined });

    const { getByText } = render(
      <DirectionsToRoomButton
        target={{ buildingCode: "MB", roomCode: "210" }}
      />,
    );

    fireEvent.press(getByText("directions-icon"));

    expect(mockToastWarn).toHaveBeenCalledWith(
      "Room location data is not available, please try again later.",
    );
    expect(mockSetEndLocation).not.toHaveBeenCalled();
    expect(mockFindAndSetStartLocation).not.toHaveBeenCalled();
    expect(mockSetCurrentMode).not.toHaveBeenCalled();
    expect(mockSetNavigationPhase).not.toHaveBeenCalled();
  });
});
