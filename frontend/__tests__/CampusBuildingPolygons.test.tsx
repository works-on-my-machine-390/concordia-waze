import CampusBuildingPolygons from "@/components/CampusBuildingPolygons";
import { CampusBuilding } from "@/hooks/queries/buildingQueries";
import { render } from "@testing-library/react-native";
import { Polygon } from "react-native-maps";

jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  default: () => ({
    mapSettings: {
      showBuildingPolygons: true,
    },
  }),
}));

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    setStartLocationAutocomplete: jest.fn(),
  }),
}));

// Mock react-native-maps
jest.mock("react-native-maps", () => ({
  Polygon: jest.fn(({ children }) => children),
}));

describe("CampusBuildingPolygons", () => {
  const mockBuildings: CampusBuilding[] = [
    {
      code: "H",
      polygon: [
        { latitude: 45.497, longitude: -73.579 },
        { latitude: 45.498, longitude: -73.578 },
        { latitude: 45.496, longitude: -73.577 },
      ],
    },
    {
      code: "MB",
      polygon: [
        { latitude: 45.495, longitude: -73.58 },
        { latitude: 45.496, longitude: -73.579 },
        { latitude: 45.494, longitude: -73.578 },
      ],
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("Renders correct number of Polygon components for all buildings", () => {
    render(<CampusBuildingPolygons buildings={mockBuildings} />);

    expect(Polygon).toHaveBeenCalledTimes(mockBuildings.length);
  });
});
