import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import Directory from "../app/(drawer)/directory";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetAllBuildings: jest.fn(),
}));

jest.mock("@/app/icons", () => ({
  DirectoryIcon: () => null,
}));

import { useGetAllBuildings } from "@/hooks/queries/buildingQueries";
const mockUseGetAllBuildings = useGetAllBuildings as jest.Mock;

// ─── Test Data ────────────────────────────────────────────────────────────────

const mockBuildings = {
  buildings: {
    SGW: [
      { code: "MB", name: "MB", long_name: "John Molson School of Business", campus: "SGW" },
      { code: "H",  name: "H",  long_name: "Henry F. Hall Building",          campus: "SGW" },
    ],
    LOY: [
      { code: "CC", name: "CC", long_name: "Central Building", campus: "LOY" },
    ],
  },
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("Directory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Loading state ──────────────────────────────────────────────────────────

  it("shows a loading indicator while buildings are being fetched", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null,
    });

    render(<Directory />);

    expect(screen.getByText("Loading buildings...")).toBeTruthy();
  });

  // ── Error state ────────────────────────────────────────────────────────────

  it("shows an error message when the fetch fails", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error("Network error"),
    });

    render(<Directory />);

    expect(
      screen.getByText("Failed to load buildings. Please try again.")
    ).toBeTruthy();
  });

  // ── Successful render ──────────────────────────────────────────────────────

  it("renders the header and search bar when data loads", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    expect(screen.getByText("Building Directory")).toBeTruthy();
    expect(
      screen.getByPlaceholderText(
        "Search by name or code (e.g., MB, John Molson)"
      )
    ).toBeTruthy();
  });

  it("renders campus section headers", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    expect(screen.getByText("Sir George Williams Campus")).toBeTruthy();
    expect(screen.getByText("Loyola Campus")).toBeTruthy();
  });

  it("renders all buildings with code and full name", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    expect(screen.getByText("MB")).toBeTruthy();
    expect(screen.getByText("John Molson School of Business")).toBeTruthy();
    expect(screen.getByText("H")).toBeTruthy();
    expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
    expect(screen.getByText("CC")).toBeTruthy();
    expect(screen.getByText("Central Building")).toBeTruthy();
  });

  // ── Search / filtering ─────────────────────────────────────────────────────

  it("filters buildings by code", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    fireEvent.changeText(searchInput, "MB");

    expect(screen.getByText("John Molson School of Business")).toBeTruthy();
    expect(screen.queryByText("Henry F. Hall Building")).toBeNull();
  });

  it("filters buildings by long name (case-insensitive)", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    fireEvent.changeText(searchInput, "hall");

    expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
    expect(screen.queryByText("John Molson School of Business")).toBeNull();
  });

  it("shows result count while searching", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    // Result count should NOT be visible before typing
    expect(screen.queryByText(/buildings found/)).toBeNull();

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    fireEvent.changeText(searchInput, "MB");

    expect(screen.getByText("1 building found")).toBeTruthy();
  });

  it("shows plural 'buildings found' when multiple results match", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    fireEvent.changeText(searchInput, "building"); // matches multiple long_names

    expect(screen.getByText(/buildings found/)).toBeTruthy();
  });

  it("hides campus sections that have no matching buildings", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    // "MB" only exists in SGW
    fireEvent.changeText(searchInput, "MB");

    expect(screen.queryByText("Loyola Campus")).toBeNull();
  });

  // ── Navigation ─────────────────────────────────────────────────────────────

  it("navigates to the map with the correct building code when a building is pressed", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    fireEvent.press(screen.getByText("John Molson School of Business"));

    expect(mockPush).toHaveBeenCalledWith("/map?selectedBuilding=MB");
  });

  it("navigates with the correct code for a Loyola building", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    fireEvent.press(screen.getByText("Central Building"));

    expect(mockPush).toHaveBeenCalledWith("/map?selectedBuilding=CC");
  });

  // ── Empty state ────────────────────────────────────────────────────────────

  it("shows empty state when search has no matches", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: mockBuildings,
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    const searchInput = screen.getByPlaceholderText(
      "Search by name or code (e.g., MB, John Molson)"
    );
    fireEvent.changeText(searchInput, "zzznomatch");

    expect(screen.getByText("No buildings found")).toBeTruthy();
    expect(screen.getByText("Try adjusting your search")).toBeTruthy();
  });

  it("shows empty state when buildings data is missing", () => {
    mockUseGetAllBuildings.mockReturnValue({
      data: { buildings: null },
      isLoading: false,
      error: null,
    });

    render(<Directory />);

    expect(screen.getByText("No buildings found")).toBeTruthy();
  });
});