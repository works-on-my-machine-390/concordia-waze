import { renderHook } from "@testing-library/react-native";
import useStartLocation from "../hooks/useStartLocation";

const mockSetStartLocation = jest.fn();
const mockSetModifyingField = jest.fn();
const mockUseNavigationStore = jest.fn();
const mockUseMapStore = jest.fn();
const mockGetAddressFromLocation = jest.fn();
const mockEnsureQueryData = jest.fn();
const mockGetQueryData = jest.fn();

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: mockGetQueryData,
    ensureQueryData: mockEnsureQueryData,
  }),
}));

jest.mock("../hooks/useNavigationStore", () => ({
  ModifyingFieldOptions: {
    start: "start",
    end: "end",
  },
  useNavigationStore: () => mockUseNavigationStore(),
}));

jest.mock("../hooks/useMapStore", () => ({
  useMapStore: () => mockUseMapStore(),
}));

jest.mock("../hooks/queries/buildingQueries", () => ({
  fetchBuildingDetails: jest.fn(),
  getBuildingDetailsQueryKey: (buildingCode: string) => [
    "buildingDetails",
    buildingCode,
  ],
}));

jest.mock("@/app/utils/mapUtils", () => ({
  getAddressFromLocation: (...args: any[]) => mockGetAddressFromLocation(...args),
}));

jest.mock("toastify-react-native", () => ({
  Toast: {
    error: jest.fn(),
  },
}));

describe("useStartLocation", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigationStore.mockReturnValue({
      setStartLocation: mockSetStartLocation,
      setModifyingField: mockSetModifyingField,
      modifyingField: "start",
    });

    mockUseMapStore.mockReturnValue({
      userLocation: undefined,
      currentBuildingCode: "MB",
    });

    mockGetQueryData.mockReturnValue(undefined);
    mockGetAddressFromLocation.mockResolvedValue("1455 De Maisonneuve Blvd W");
    mockEnsureQueryData.mockResolvedValue({
      code: "H",
      long_name: "Hall Building",
      latitude: 45.497,
      longitude: -73.579,
      address: "1455 De Maisonneuve Blvd W",
    });
  });

  test("prompts manual start selection when no building details and no user location", async () => {
    const { result } = renderHook(() => useStartLocation());

    await result.current.findAndSetStartLocation();

    expect(mockSetStartLocation).toHaveBeenCalledWith(null);
    expect(mockSetModifyingField).toHaveBeenCalledWith("start");
  });

  test("prompts manual start selection when end location is in same building", async () => {
    mockGetQueryData.mockReturnValue({ code: "MB" });

    const { result } = renderHook(() => useStartLocation());

    await result.current.findAndSetStartLocation({
      name: "John Molson Building",
      latitude: 45.497,
      longitude: -73.579,
      code: "MB",
    });

    expect(mockSetStartLocation).toHaveBeenCalledWith(null);
    expect(mockSetModifyingField).toHaveBeenCalledWith("start");
  });

  test("uses reverse geocoding when only GPS location is available", async () => {
    mockUseMapStore.mockReturnValue({
      userLocation: {
        coords: {
          latitude: 45.501,
          longitude: -73.57,
        },
      },
      currentBuildingCode: "MB",
    });

    const { result } = renderHook(() => useStartLocation());

    await result.current.findAndSetStartLocation();

    expect(mockGetAddressFromLocation).toHaveBeenCalled();
    expect(mockSetStartLocation).toHaveBeenCalledWith({
      name: "1455 De Maisonneuve Blvd W",
      latitude: 45.501,
      longitude: -73.57,
      code: "",
      address: "1455 De Maisonneuve Blvd W",
    });
  });

  test("uses building details when current building is known", async () => {
    mockGetQueryData.mockReturnValue({
      code: "H",
      long_name: "Hall Building",
      latitude: 45.497,
      longitude: -73.579,
      address: "1455 De Maisonneuve Blvd W",
    });

    const { result } = renderHook(() => useStartLocation());

    await result.current.findAndSetStartLocation();

    expect(mockSetStartLocation).toHaveBeenCalledWith({
      name: "Hall Building",
      latitude: 45.497,
      longitude: -73.579,
      code: "H",
      address: "1455 De Maisonneuve Blvd W",
    });
  });

  test("setStartLocationManually only updates while modifying start field", () => {
    const { result, rerender } = renderHook(() => useStartLocation());

    result.current.setStartLocationManually({
      name: "MB",
      latitude: 45.497,
      longitude: -73.579,
      code: "MB",
    });

    expect(mockSetStartLocation).toHaveBeenCalledWith({
      name: "MB",
      latitude: 45.497,
      longitude: -73.579,
      code: "MB",
    });
    expect(mockSetModifyingField).toHaveBeenCalledWith(null);

    mockUseNavigationStore.mockReturnValue({
      setStartLocation: mockSetStartLocation,
      setModifyingField: mockSetModifyingField,
      modifyingField: "end",
    });

    rerender(undefined);

    result.current.setStartLocationManually({
      name: "Should not set",
      latitude: 0,
      longitude: 0,
      code: "X",
    });

    expect(mockSetStartLocation).toHaveBeenCalledTimes(1);
  });

  test("setStartLocationAutocomplete sets location from cached query data", async () => {
    const { result } = renderHook(() => useStartLocation());

    await result.current.setStartLocationAutocomplete("H");

    expect(mockEnsureQueryData).toHaveBeenCalled();
    expect(mockSetStartLocation).toHaveBeenCalledWith({
      name: "Hall Building",
      latitude: 45.497,
      longitude: -73.579,
      code: "H",
      address: "1455 De Maisonneuve Blvd W",
    });
    expect(mockSetModifyingField).toHaveBeenCalledWith(null);
  });

  test("setStartLocationAutocomplete keeps manual flow active when lookup fails", async () => {
    const { Toast } = require("toastify-react-native");
    mockEnsureQueryData.mockRejectedValue(new Error("Lookup failed"));

    const { result } = renderHook(() => useStartLocation());

    await result.current.setStartLocationAutocomplete("H");

    expect(Toast.error).toHaveBeenCalledWith(
      "Failed to get information about the selected building, please try again.",
    );
    expect(mockSetStartLocation).toHaveBeenCalledWith(null);
    expect(mockSetModifyingField).toHaveBeenCalledWith("start");
  });
});
