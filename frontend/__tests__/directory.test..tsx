jest.mock("expo-router", () => ({
    useRouter: jest.fn(),
  }));
  
  jest.mock("../hooks/queries/buildingQueries", () => ({
    useGetAllBuildings: jest.fn(),
  }));
  
  import React from "react";
  import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
  import { useRouter } from "expo-router";
  import Directory from "../app/(drawer)/directory";
  import { useGetAllBuildings } from "../hooks/queries/buildingQueries";
  
  const mockRouter = {
    push: jest.fn(),
  };
  
  const mockBuildingsData = {
    buildings: {
      SGW: [
        {
          name: "Hall Building",
          long_name: "Henry F. Hall Building",
          code: "H",
          campus: "SGW",
        },
        {
          name: "Library Building",
          long_name: "J.W. McConnell Building",
          code: "LB",
          campus: "SGW",
        },
        {
          name: "John Molson Building",
          long_name: "John Molson School of Business",
          code: "MB",
          campus: "SGW",
        },
      ],
      LOY: [
        {
          name: "Central Building",
          long_name: "Central Building",
          code: "CC",
          campus: "LOY",
        },
        {
          name: "Administration Building",
          long_name: "Administration Building",
          code: "AD",
          campus: "LOY",
        },
      ],
    },
  };
  
  describe("Directory", () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (useRouter as jest.Mock).mockReturnValue(mockRouter);
    });
  
    describe("Loading State", () => {
      it("should display loading spinner when data is being fetched", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: undefined,
          isLoading: true,
          error: null,
        });
  
        render(<Directory />);
  
        expect(screen.getByText("Loading buildings...")).toBeTruthy();
        expect(screen.getByTestId("activity-indicator")).toBeTruthy();
      });
    });
  
    describe("Error State", () => {
      it("should display error message when fetch fails", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: new Error("Network error"),
        });
  
        render(<Directory />);
  
        expect(
          screen.getByText("Failed to load buildings. Please try again.")
        ).toBeTruthy();
      });
    });
  
    describe("Successful Data Load", () => {
      beforeEach(() => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: mockBuildingsData,
          isLoading: false,
          error: null,
        });
      });
  
      it("should display the header with title and icon", () => {
        render(<Directory />);
  
        expect(screen.getByText("Building Directory")).toBeTruthy();
      });
  
      it("should display search input with placeholder", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
        expect(searchInput).toBeTruthy();
      });
  
      it("should display all SGW buildings", () => {
        render(<Directory />);
  
        expect(screen.getByText("Sir George Williams Campus")).toBeTruthy();
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
        expect(screen.getByText("Hall Building")).toBeTruthy();
        expect(screen.getByText("J.W. McConnell Building")).toBeTruthy();
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
      });
  
      it("should display all Loyola buildings", () => {
        render(<Directory />);
  
        expect(screen.getByText("Loyola Campus")).toBeTruthy();
        expect(screen.getByText("Central Building")).toBeTruthy();
        expect(screen.getByText("Administration Building")).toBeTruthy();
      });
  
      it("should display building codes in maroon boxes", () => {
        render(<Directory />);
  
        expect(screen.getByText("H")).toBeTruthy();
        expect(screen.getByText("LB")).toBeTruthy();
        expect(screen.getByText("MB")).toBeTruthy();
        expect(screen.getByText("CC")).toBeTruthy();
        expect(screen.getByText("AD")).toBeTruthy();
      });
    });
  
    describe("Search Functionality", () => {
      beforeEach(() => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: mockBuildingsData,
          isLoading: false,
          error: null,
        });
      });
  
      it("should filter buildings by code (lowercase)", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "mb");
  
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
        expect(screen.queryByText("Henry F. Hall Building")).toBeFalsy();
        expect(screen.queryByText("Central Building")).toBeFalsy();
      });
  
      it("should filter buildings by code (uppercase)", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "MB");
  
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
        expect(screen.queryByText("Henry F. Hall Building")).toBeFalsy();
      });
  
      it("should filter buildings by name (partial match)", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "john");
  
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
        expect(screen.queryByText("Henry F. Hall Building")).toBeFalsy();
      });
  
      it("should filter buildings by long_name (partial match)", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "henry");
  
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
        expect(screen.queryByText("John Molson School of Business")).toBeFalsy();
      });
  
      it("should be case-insensitive", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "HALL");
  
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
      });
  
      it("should display results count when searching", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "mb");
  
        expect(screen.getByText("1 building found")).toBeTruthy();
      });
  
      it("should display correct plural form for multiple results", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "building");
  
        expect(screen.getByText(/buildings found/)).toBeTruthy();
      });
  
      it("should show empty state when no results found", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "xyz123");
  
        expect(screen.getByText("No buildings found")).toBeTruthy();
        expect(screen.getByText("Try adjusting your search")).toBeTruthy();
      });
  
      it("should clear search and show all buildings when search is empty", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        // Search first
        fireEvent.changeText(searchInput, "mb");
        expect(screen.queryByText("Henry F. Hall Building")).toBeFalsy();
  
        // Clear search
        fireEvent.changeText(searchInput, "");
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
      });
  
      it("should trim whitespace from search query", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        fireEvent.changeText(searchInput, "  mb  ");
  
        expect(screen.getByText("John Molson School of Business")).toBeTruthy();
        expect(screen.queryByText("Henry F. Hall Building")).toBeFalsy();
      });
  
      it("should hide campus section when no buildings match in that campus", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        // Search for SGW-only building
        fireEvent.changeText(searchInput, "hall");
  
        expect(screen.getByText("Sir George Williams Campus")).toBeTruthy();
        expect(screen.queryByText("Loyola Campus")).toBeFalsy();
      });
    });
  
    describe("Navigation", () => {
      beforeEach(() => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: mockBuildingsData,
          isLoading: false,
          error: null,
        });
      });
  
      it("should navigate to map when building is pressed", () => {
        render(<Directory />);
  
        const mbBuilding = screen.getByText("John Molson School of Business");
        fireEvent.press(mbBuilding);
  
        expect(mockRouter.push).toHaveBeenCalledWith("/map?selectedBuilding=MB");
      });
  
      it("should navigate with correct building code for each building", () => {
        render(<Directory />);
  
        // Test Hall Building
        const hallBuilding = screen.getByText("Henry F. Hall Building");
        fireEvent.press(hallBuilding);
        expect(mockRouter.push).toHaveBeenCalledWith("/map?selectedBuilding=H");
  
        // Test Library Building
        const libraryBuilding = screen.getByText("J.W. McConnell Building");
        fireEvent.press(libraryBuilding);
        expect(mockRouter.push).toHaveBeenCalledWith("/map?selectedBuilding=LB");
  
        // Test Central Building
        const centralBuilding = screen.getByText("Central Building");
        fireEvent.press(centralBuilding);
        expect(mockRouter.push).toHaveBeenCalledWith("/map?selectedBuilding=CC");
      });
  
      it("should navigate when pressing building code container", () => {
        render(<Directory />);
  
        const mbCode = screen.getByText("MB");
        fireEvent.press(mbCode);
  
        expect(mockRouter.push).toHaveBeenCalledWith("/map?selectedBuilding=MB");
      });
    });
  
    describe("Edge Cases", () => {
      it("should handle empty buildings data", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: { buildings: { SGW: [], LOY: [] } },
          isLoading: false,
          error: null,
        });
  
        render(<Directory />);
  
        expect(screen.queryByText("Sir George Williams Campus")).toBeFalsy();
        expect(screen.queryByText("Loyola Campus")).toBeFalsy();
      });
  
      it("should handle missing SGW campus data", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: {
            buildings: {
              SGW: [],
              LOY: mockBuildingsData.buildings.LOY,
            },
          },
          isLoading: false,
          error: null,
        });
  
        render(<Directory />);
  
        expect(screen.queryByText("Sir George Williams Campus")).toBeFalsy();
        expect(screen.getByText("Loyola Campus")).toBeTruthy();
      });
  
      it("should handle missing LOY campus data", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: {
            buildings: {
              SGW: mockBuildingsData.buildings.SGW,
              LOY: [],
            },
          },
          isLoading: false,
          error: null,
        });
  
        render(<Directory />);
  
        expect(screen.getByText("Sir George Williams Campus")).toBeTruthy();
        expect(screen.queryByText("Loyola Campus")).toBeFalsy();
      });
  
      it("should handle undefined buildings data gracefully", () => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: undefined,
          isLoading: false,
          error: null,
        });
  
        render(<Directory />);
  
        // Should not crash and should show empty state
        expect(screen.queryByText("Sir George Williams Campus")).toBeFalsy();
      });
    });
  
    describe("UI Interaction", () => {
      beforeEach(() => {
        (useGetAllBuildings as jest.Mock).mockReturnValue({
          data: mockBuildingsData,
          isLoading: false,
          error: null,
        });
      });
  
      it("should update results dynamically as user types", () => {
        render(<Directory />);
  
        const searchInput = screen.getByPlaceholderText(
          "Search by name or code (e.g., MB, John Molson)"
        );
  
        // Type "h"
        fireEvent.changeText(searchInput, "h");
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
  
        // Type "ha"
        fireEvent.changeText(searchInput, "ha");
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
  
        // Type "hall"
        fireEvent.changeText(searchInput, "hall");
        expect(screen.getByText("Henry F. Hall Building")).toBeTruthy();
        expect(screen.queryByText("John Molson School of Business")).toBeFalsy();
      });
    });
  });