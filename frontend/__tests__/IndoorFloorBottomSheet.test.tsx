import type { Floor } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import IndoorFloorBottomSheet from "../components/indoor/IndoorFloorBottomSheet";

jest.mock("@gorhom/bottom-sheet", () => {
  const { View } = require("react-native");
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="bottom-sheet">{children}</View>,
  };
});

jest.mock("../components/MetroAccessibleChip", () => {
  const { View } = require("react-native");
  return () => <View testID="metro-chip" />;
});

jest.mock("@/app/icons", () => {
  const { View } = require("react-native");
  return {
    ElevatorIcon: () => <View testID="elevator-icon" />,
    SlopeUpIcon: () => <View testID="slope-icon" />,
    WheelchairIcon: () => <View testID="wheelchair-icon" />,
  };
});

const createFloor = (overrides?: Partial<Floor>): Floor => ({
  number: 1,
  name: "Floor 1",
  imgPath: "test.svg",
  vertices: [],
  edges: [],
  pois: [],
  ...overrides,
});

describe("IndoorFloorBottomSheet", () => {
  test("renders building name, code, and floor number", () => {
    const { getByText } = renderWithProviders(
      <IndoorFloorBottomSheet floor={createFloor()} buildingCode="CC" buildingName="CC Building" />,
    );
    expect(getByText(/CC Building \(CC\) - 1st Floor/)).toBeTruthy();
  });

  test("formats floor numbers as ordinals", () => {
    const { getByText: getText1, unmount: unmount1 } = renderWithProviders(
      <IndoorFloorBottomSheet floor={createFloor({ number: 2 })} buildingCode="H" buildingName="Hall" />,
    );
    expect(getText1(/2nd Floor/)).toBeTruthy();
    unmount1();

    const { getByText: getText2 } = renderWithProviders(
      <IndoorFloorBottomSheet floor={createFloor({ number: -2 })} buildingCode="MB" buildingName="MB" />,
    );
    expect(getText2(/S2 Floor/)).toBeTruthy();
  });

  test("renders accessibility icons for elevators and ramps", () => {
    const floor = createFloor({
      pois: [
        {
          name: "alt_1",
          type: "elevator",
          position: { x: 0.5, y: 0.5 },
          polygon: [],
          floor_number: 1,
          latitude: 45.497,
          longitude: -73.579,
          building: "CC",
        },
        {
          name: "alt_2",
          type: "ramp",
          position: { x: 0.6, y: 0.6 },
          polygon: [],
          floor_number: 1,
          latitude: 45.497,
          longitude: -73.579,
          building: "CC",
        },
      ],
    });

    const { getByTestId } = renderWithProviders(
      <IndoorFloorBottomSheet floor={floor} buildingCode="CC" buildingName="CC" />,
    );

    expect(getByTestId("wheelchair-icon")).toBeTruthy();
    expect(getByTestId("elevator-icon")).toBeTruthy();
    expect(getByTestId("slope-icon")).toBeTruthy();
  });

  test("renders metro chip when metroAccessible is true", () => {
    const { getByTestId } = renderWithProviders(
      <IndoorFloorBottomSheet floor={createFloor()} buildingCode="CC" buildingName="CC" metroAccessible={true} />,
    );
    expect(getByTestId("metro-chip")).toBeTruthy();

    const { queryByTestId } = renderWithProviders(
      <IndoorFloorBottomSheet floor={createFloor()} buildingCode="CC" buildingName="CC" metroAccessible={false} />,
    );
    expect(queryByTestId("metro-chip")).toBeNull();
  });
});
