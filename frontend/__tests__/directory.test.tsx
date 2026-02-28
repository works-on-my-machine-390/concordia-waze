/**
 * Tests for Directory
 */

import {
  act,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react-native";
import Directory from "../app/(drawer)/directory";
import { renderWithProviders } from "../test_utils/renderUtils";

const mockPush = jest.fn();
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  useSegments: () => [],
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    push: jest.fn(),
    setParams: jest.fn(),
  })),
  Stack: { Screen: () => null },
}));

const mockUseGetAllBuildings = jest.fn();
jest.mock("@/hooks/queries/buildingQueries", () => ({
  ...jest.requireActual("@/hooks/queries/buildingQueries"),
  useGetAllBuildings: () => mockUseGetAllBuildings(),
  CampusCode: { SGW: "SGW", LOY: "LOY" },
}));

// ── Fixtures

const SGW_BUILDINGS = [
  {
    code: "H",
    name: "Hall",
    long_name: "Henry F. Hall Building",
    campus: "SGW",
    latitude: 45.4971,
    longitude: -73.5788,
  },
  {
    code: "MB",
    name: "John Molson",
    long_name: "John Molson Building",
    campus: "SGW",
    latitude: 45.4956,
    longitude: -73.5784,
  },
  {
    code: "EV",
    name: "EV Building",
    long_name: "Engineering & Visual Arts",
    campus: "SGW",
    latitude: 45.4947,
    longitude: -73.579,
  },
];
const LOY_BUILDINGS = [
  {
    code: "AD",
    name: "Admin",
    long_name: "Administration Building",
    campus: "LOY",
    latitude: 45.4584,
    longitude: -73.6404,
  },
  {
    code: "CC",
    name: "Comm Center",
    long_name: "Communication Centre",
    campus: "LOY",
    latitude: 45.4587,
    longitude: -73.6398,
  },
];
const ALL = { buildings: { SGW: SGW_BUILDINGS, LOY: LOY_BUILDINGS } };

const mockLoaded = (data = ALL) =>
  mockUseGetAllBuildings.mockReturnValue({
    data,
    isLoading: false,
    error: null,
  });
const mockLoading = () =>
  mockUseGetAllBuildings.mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  });
const mockError = () =>
  mockUseGetAllBuildings.mockReturnValue({
    data: undefined,
    isLoading: false,
    error: new Error("fail"),
  });

// Tests

describe("Directory screen", () => {
  beforeEach(() => jest.clearAllMocks());
  afterEach(() => cleanup());

  test("shows loading indicator", () => {
    mockLoading();
    expect(
      renderWithProviders(<Directory />).getByText("Loading buildings..."),
    ).toBeTruthy();
  });

  test("shows error message", () => {
    mockError();
    expect(
      renderWithProviders(<Directory />).getByText(
        "Failed to load buildings. Please try again.",
      ),
    ).toBeTruthy();
  });

  test("renders header", () => {
    mockLoaded();
    expect(
      renderWithProviders(<Directory />).getByText("Building Directory"),
    ).toBeTruthy();
  });

  test("renders SGW campus header", () => {
    mockLoaded();
    expect(
      renderWithProviders(<Directory />).getByText(
        "Sir George Williams Campus",
      ),
    ).toBeTruthy();
  });

  test("renders Loyola campus header", () => {
    mockLoaded();
    expect(
      renderWithProviders(<Directory />).getByText("Loyola Campus"),
    ).toBeTruthy();
  });

  test("renders all SGW building names", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    expect(getByText("Henry F. Hall Building")).toBeTruthy();
    expect(getByText("John Molson Building")).toBeTruthy();
    expect(getByText("Engineering & Visual Arts")).toBeTruthy();
  });

  test("renders all LOY building names", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    expect(getByText("Administration Building")).toBeTruthy();
    expect(getByText("Communication Centre")).toBeTruthy();
  });

  test("renders building codes as badges", () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    expect(getByText("H")).toBeTruthy();
    expect(getByText("MB")).toBeTruthy();
    expect(getByText("AD")).toBeTruthy();
  });

  test("renders search placeholder", () => {
    mockLoaded();
    expect(
      renderWithProviders(<Directory />).getByPlaceholderText(
        "Search by name or code (e.g., MB, John Molson)",
      ),
    ).toBeTruthy();
  });

  test("no results count when search is empty", () => {
    mockLoaded();
    expect(
      renderWithProviders(<Directory />).queryByText(/buildings? found/),
    ).toBeNull();
  });

  test("shows '1 building found' for one match", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Directory />,
    );
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "Henry F. Hall",
      );
    });
    await waitFor(() => expect(getByText("1 building found")).toBeTruthy());
  });

  test("shows plural 'buildings found' for multiple matches", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Directory />,
    );
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "building",
      );
    });
    await waitFor(() => expect(getByText(/\d+ buildings found/)).toBeTruthy());
  });

  test("shows '0 buildings found' for no match", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Directory />,
    );
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "xyznonexistent",
      );
    });
    await waitFor(() => expect(getByText("0 buildings found")).toBeTruthy());
  });

  test("filters by long_name case-insensitively", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "molson",
      );
    });
    await waitFor(() => {
      expect(getByText("John Molson Building")).toBeTruthy();
      expect(queryByText("Henry F. Hall Building")).toBeNull();
    });
  });

  test("filters by code case-insensitively", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "ev",
      );
    });
    await waitFor(() => {
      expect(getByText("Engineering & Visual Arts")).toBeTruthy();
      expect(queryByText("John Molson Building")).toBeNull();
    });
  });

  test("filters by short name", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText, queryByText } =
      renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "Admin",
      );
    });
    await waitFor(() => {
      expect(getByText("Administration Building")).toBeTruthy();
      expect(queryByText("John Molson Building")).toBeNull();
    });
  });

  test("hides campus section when no buildings match in it", async () => {
    mockLoaded();
    const { getByPlaceholderText, queryByText } = renderWithProviders(
      <Directory />,
    );
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "Hall",
      );
    });
    await waitFor(() => expect(queryByText("Loyola Campus")).toBeNull());
  });

  test("whitespace-only query shows all buildings", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Directory />,
    );
    await act(async () => {
      fireEvent.changeText(
        getByPlaceholderText("Search by name or code (e.g., MB, John Molson)"),
        "   ",
      );
    });
    await waitFor(() => {
      expect(getByText("Henry F. Hall Building")).toBeTruthy();
      expect(getByText("Administration Building")).toBeTruthy();
    });
  });

  test("clearing search restores all buildings", async () => {
    mockLoaded();
    const { getByPlaceholderText, getByText } = renderWithProviders(
      <Directory />,
    );
    const input = getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)",
    );
    await act(async () => {
      fireEvent.changeText(input, "Hall");
    });
    await act(async () => {
      fireEvent.changeText(input, "");
    });
    await waitFor(() => {
      expect(getByText("Henry F. Hall Building")).toBeTruthy();
      expect(getByText("Administration Building")).toBeTruthy();
    });
  });

  test("pressing a building navigates with selected building and camera params", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.press(getByText("Henry F. Hall Building"));
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        selected: "H",
        camLat: 45.4971,
        camLng: -73.5788,
        campus: "SGW",
      },
    });
  });

  test("pressing a LOY building uses its own params", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.press(getByText("Administration Building"));
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        selected: "AD",
        camLat: 45.4584,
        camLng: -73.6404,
        campus: "LOY",
      },
    });
  });

  test("pressing short name (same Pressable) also navigates with params", async () => {
    mockLoaded();
    const { getByText } = renderWithProviders(<Directory />);
    await act(async () => {
      fireEvent.press(getByText("Comm Center"));
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/map",
      params: {
        selected: "CC",
        camLat: 45.4587,
        camLng: -73.6398,
        campus: "LOY",
      },
    });
  });

  test("renders without crash when both arrays are empty", () => {
    mockLoaded({ buildings: { SGW: [], LOY: [] } });
    const { queryByText } = renderWithProviders(<Directory />);
    expect(queryByText("Sir George Williams Campus")).toBeNull();
    expect(queryByText("Loyola Campus")).toBeNull();
  });

  test("renders only SGW when LOY is empty", () => {
    mockLoaded({ buildings: { SGW: SGW_BUILDINGS, LOY: [] } });
    const { getByText, queryByText } = renderWithProviders(<Directory />);
    expect(getByText("Sir George Williams Campus")).toBeTruthy();
    expect(queryByText("Loyola Campus")).toBeNull();
  });

  test("renders only LOY when SGW is empty", () => {
    mockLoaded({ buildings: { SGW: [], LOY: LOY_BUILDINGS } });
    const { queryByText, getByText } = renderWithProviders(<Directory />);
    expect(queryByText("Sir George Williams Campus")).toBeNull();
    expect(getByText("Loyola Campus")).toBeTruthy();
  });

  test("does not crash when buildings is undefined", () => {
    mockLoaded({ buildings: undefined } as any);
    const { queryByText } = renderWithProviders(<Directory />);
    expect(queryByText("Sir George Williams Campus")).toBeNull();
  });
});
