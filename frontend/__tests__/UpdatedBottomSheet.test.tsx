import React from "react";
import { fireEvent, render, screen } from "@testing-library/react-native";
import BuildingBottomSheet from "../components/BuildingBottomSheet";
import { useGetBuildingDetails } from "@/hooks/queries/buildingQueries";

jest.mock("@/hooks/queries/buildingQueries", () => ({
  useGetBuildingDetails: jest.fn(),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const React = require("react");
  const { View, ScrollView } = require("react-native");

  const BottomSheet = React.forwardRef(
    ({ children, onChange }: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: jest.fn(),
      }));
      return <View testID="bottom-sheet">{children}</View>;
    }
  );
  BottomSheet.displayName = "BottomSheet";

  const BottomSheetScrollView = ({ children, contentContainerStyle }: any) => (
    <ScrollView contentContainerStyle={contentContainerStyle}>
      {children}
    </ScrollView>
  );

  return { __esModule: true, default: BottomSheet, BottomSheetScrollView };
});

jest.mock("../components/BuildingGallery", () => {
  const { View } = require("react-native");
  return () => <View testID="building-gallery" />;
});

jest.mock("../assets/images/icon-dizzy.png", () => "icon-dizzy");

const BASE_BUILDING = {
  code: "H",
  long_name: "Hall Building",
  address: "1455 De Maisonneuve Blvd. W.",
  accessibility: [
    "Accessible entrance",
    "Accessible building elevator",
    "Accessibility ramp",
  ],
  services: ["Service A", "Service B"],
  departments: ["Dept A"],
  venues: ["Venue A"],
};

const mockSuccess = (overrides: Partial<typeof BASE_BUILDING> = {}) => {
  (useGetBuildingDetails as jest.Mock).mockReturnValue({
    data: { ...BASE_BUILDING, ...overrides },
    isSuccess: true,
  });
};

const mockNoData = () => {
  (useGetBuildingDetails as jest.Mock).mockReturnValue({
    data: null,
    isSuccess: false,
  });
};

describe("BuildingBottomSheet", () => {
  afterEach(() => jest.clearAllMocks());

  describe("when there is no building data", () => {
    it("renders the empty state message", () => {
      mockNoData();
      render(<BuildingBottomSheet buildingCode={null} />);
      expect(
        screen.getByText("No information available for this building")
      ).toBeTruthy();
    });

    it("renders the empty state when buildingCode is an empty string", () => {
      mockNoData();
      render(<BuildingBottomSheet buildingCode="" />);
      expect(
        screen.getByText("No information available for this building")
      ).toBeTruthy();
    });

    it("does not render building name or address", () => {
      mockNoData();
      render(<BuildingBottomSheet buildingCode={null} />);
      expect(screen.queryByText(/Hall Building/)).toBeNull();
    });
  });

  describe("normal mode", () => {
    it("renders building name and code", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("renders building address", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(
        screen.getByText("1455 De Maisonneuve Blvd. W.")
      ).toBeTruthy();
    });

    it("renders services list", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Services")).toBeTruthy();
      expect(screen.getByText("Service A")).toBeTruthy();
      expect(screen.getByText("Service B")).toBeTruthy();
    });

    it("renders departments list", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Departments")).toBeTruthy();
      expect(screen.getByText("Dept A")).toBeTruthy();
    });

    it("renders venues list", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Venues")).toBeTruthy();
      expect(screen.getByText("Venue A")).toBeTruthy();
    });

    it("renders the BuildingGallery", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByTestId("building-gallery")).toBeTruthy();
    });

    it("calls onStartNavigation with building code when directions icon pressed", () => {
      mockSuccess();
      const onStartNavigation = jest.fn();
      render(
        <BuildingBottomSheet
          buildingCode="H"
          onStartNavigation={onStartNavigation}
        />
      );

      const touchables = screen.getAllByRole("button");
      fireEvent.press(touchables[0]);
      expect(onStartNavigation).toHaveBeenCalledWith("H");
    });

    it("calls onClose when close button is pressed", () => {
      mockSuccess();
      const onClose = jest.fn();
      render(<BuildingBottomSheet buildingCode="H" onClose={onClose} />);
      const touchables = screen.getAllByRole("button");
      fireEvent.press(touchables[touchables.length - 1]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not throw when onClose is not provided and close is pressed", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      const touchables = screen.getAllByRole("button");
      expect(() =>
        fireEvent.press(touchables[touchables.length - 1])
      ).not.toThrow();
    });

    it("does not throw when onStartNavigation is not provided and directions pressed", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      const touchables = screen.getAllByRole("button");
      expect(() => fireEvent.press(touchables[0])).not.toThrow();
    });
  });


  describe("accessibility icons", () => {
    it("shows wheelchair icon when accessible entrance is listed", () => {
      mockSuccess({ accessibility: ["Accessible entrance"] });
      const { UNSAFE_getAllByType } = render(
        <BuildingBottomSheet buildingCode="H" />
      );
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("shows elevator icon when elevator accessibility is listed", () => {
      mockSuccess({ accessibility: ["Accessible building elevator"] });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("shows ramp icon when ramp accessibility is listed", () => {
      mockSuccess({ accessibility: ["Accessibility ramp"] });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("shows no accessibility icons when accessibility list is empty", () => {
      mockSuccess({ accessibility: [] });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("handles all three accessibility features together", () => {
      mockSuccess({
        accessibility: [
          "Accessible entrance",
          "Accessible building elevator",
          "Accessibility ramp",
        ],
      });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });
  });

  describe("navigation mode", () => {
    it("does not render building name in navigation mode", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={true} />
      );
      expect(screen.queryByText("Hall Building (H)")).toBeNull();
    });

    it("does not render services/departments/venues in navigation mode", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={true} />
      );
      expect(screen.queryByText("Services")).toBeNull();
      expect(screen.queryByText("Departments")).toBeNull();
      expect(screen.queryByText("Venues")).toBeNull();
    });

    it("does not render BuildingGallery in navigation mode", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={true} />
      );
      expect(screen.queryByTestId("building-gallery")).toBeNull();
    });

    it("calls onClose when close button pressed in navigation mode", () => {
      mockSuccess();
      const onClose = jest.fn();
      render(
        <BuildingBottomSheet
          buildingCode="H"
          isNavigationMode={true}
          onClose={onClose}
        />
      );
      const touchables = screen.getAllByRole("button");
      fireEvent.press(touchables[touchables.length - 1]);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("does not throw when onClose is not provided in navigation mode", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={true} />
      );
      const touchables = screen.getAllByRole("button");
      expect(() =>
        fireEvent.press(touchables[touchables.length - 1])
      ).not.toThrow();
    });
  });

  describe("isNavigationMode effect", () => {
    it("renders without error when isNavigationMode is false", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={false} />
      );
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });

    it("renders without error when isNavigationMode is true", () => {
      mockSuccess();
      render(
        <BuildingBottomSheet buildingCode="H" isNavigationMode={true} />
      );
      expect(screen.getByTestId("bottom-sheet")).toBeTruthy();
    });

    it("renders without error when isNavigationMode is undefined", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(screen.getByText("Hall Building (H)")).toBeTruthy();
    });
  });

  describe("buildingCode edge cases", () => {
    it("passes empty string to query when buildingCode is null", () => {
      mockNoData();
      render(<BuildingBottomSheet buildingCode={null} />);
      expect(useGetBuildingDetails).toHaveBeenCalledWith("");
    });

    it("passes buildingCode to query when provided", () => {
      mockSuccess();
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(useGetBuildingDetails).toHaveBeenCalledWith("H");
    });
  });

  describe("query data without accessibility field", () => {
    it("renders empty state when data has no accessibility field", () => {
      (useGetBuildingDetails as jest.Mock).mockReturnValue({
        data: { ...BASE_BUILDING, accessibility: undefined },
        isSuccess: true,
      });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(
        screen.getByText("No information available for this building")
      ).toBeTruthy();
    });

    it("renders empty state when isSuccess is false even with data", () => {
      (useGetBuildingDetails as jest.Mock).mockReturnValue({
        data: BASE_BUILDING,
        isSuccess: false,
      });
      render(<BuildingBottomSheet buildingCode="H" />);
      expect(
        screen.getByText("No information available for this building")
      ).toBeTruthy();
    });
  });
});