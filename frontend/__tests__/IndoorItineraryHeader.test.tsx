import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorItineraryHeader from "@/components/indoor/IndoorItineraryHeader";
import { useNavigationStore } from "@/hooks/useNavigationStore";

const mockDispatch = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();

const mockStore = {
  startLocation: undefined as any,
  endLocation: undefined as any,
  setModifyingField: jest.fn(),
};

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 10 }),
}));

jest.mock("expo-router", () => ({
  useNavigation: () => ({
    dispatch: mockDispatch,
  }),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock("@react-navigation/native", () => ({
  DrawerActions: {
    openDrawer: () => ({ type: "OPEN_DRAWER" }),
  },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/app/constants", () => ({
  COLORS: {
    maroon: "#912338",
    textSecondary: "#777",
    textPrimary: "#111",
  },
}));

jest.mock("@/app/icons", () => ({
  CircleIcon: () => null,
  LocationIcon: () => null,
}));

jest.mock("@/hooks/useMapStore", () => ({
  useMapStore: jest.fn(() => ({})),
  MapMode: {
    NONE: "NONE",
  },
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  useNavigationStore: jest.fn(),
}));

const mockedUseNavigationStore = useNavigationStore as unknown as jest.Mock;

describe("IndoorItineraryHeader", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.startLocation = undefined;
    mockStore.endLocation = undefined;

    mockedUseNavigationStore.mockReturnValue(mockStore);
  });

  it("renders default start and end labels", () => {
    const { getByText, getByTestId } = render(<IndoorItineraryHeader />);

    expect(getByTestId("indoor-itinerary-header")).toBeTruthy();
    expect(getByText("Select start")).toBeTruthy();
    expect(getByText("Select destination")).toBeTruthy();
  });

  it("renders display labels when available", () => {
    mockStore.startLocation = {
      name: "Hall Building",
    };
    mockStore.endLocation = {
      name: "Library Entrance",
    };

    const { getByText } = render(<IndoorItineraryHeader />);

    expect(getByText("Hall Building")).toBeTruthy();
    expect(getByText("Library Entrance")).toBeTruthy();
  });

  it("opens drawer when menu is pressed", () => {
    const { getByTestId } = render(<IndoorItineraryHeader />);

    fireEvent.press(getByTestId("open-drawer-btn"));

    expect(mockDispatch).toHaveBeenCalledWith({ type: "OPEN_DRAWER" });
  });

  it("navigates back to map when back is pressed", () => {
    const { getByTestId } = render(<IndoorItineraryHeader />);

    fireEvent.press(getByTestId("itinerary-back-btn"));

    expect(mockReplace).toHaveBeenCalledWith("/map");
  });

  it("sets modifying field to start and navigates to indoor search", () => {
    const { getByText } = render(<IndoorItineraryHeader />);

    fireEvent.press(getByText("Select start"));

    expect(mockStore.setModifyingField).toHaveBeenCalledWith("start");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-search",
      params: {
        itineraryField: "start",
      },
    });
  });

  it("sets modifying field to end and navigates to indoor search", () => {
    const { getByText } = render(<IndoorItineraryHeader />);

    fireEvent.press(getByText("Select destination"));

    expect(mockStore.setModifyingField).toHaveBeenCalledWith("end");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/indoor-search",
      params: {
        itineraryField: "end",
      },
    });
  });
});