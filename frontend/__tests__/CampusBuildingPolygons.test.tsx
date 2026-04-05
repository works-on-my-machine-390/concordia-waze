import CampusBuildingPolygons from "@/components/CampusBuildingPolygons";
import { CAMPUS_BUILDING_STYLE } from "@/app/styles/buildingPolygons/campusBuildingStyle";
import { CURRENT_BUILDING_STYLE } from "@/app/styles/buildingPolygons/currentBuildingStyle";
import { SELECTED_BUILDING_STYLE } from "@/app/styles/buildingPolygons/selectedBuildingStyle";
import { CampusBuilding } from "@/hooks/queries/buildingQueries";
import { MapMode } from "@/hooks/useMapStore";
import { ModifyingFieldOptions } from "@/hooks/useNavigationStore";
import { render } from "@testing-library/react-native";
import { Polygon } from "react-native-maps";

const mockSetSelectedBuildingCode = jest.fn();
const mockSetCurrentMode = jest.fn();
const mockSetStartLocationAutocomplete = jest.fn();

let mockShowBuildingPolygons = true;
let mockCurrentBuildingCode = "";
let mockSelectedBuildingCode = "";
let mockStartLocation: unknown = { code: "H" };
let mockModifyingField = undefined;

jest.mock("@/hooks/useMapSettings", () => ({
  __esModule: true,
  default: () => ({
    mapSettings: {
      showBuildingPolygons: mockShowBuildingPolygons,
    },
  }),
}));

jest.mock("@/hooks/useMapStore", () => ({
  __esModule: true,
  MapMode: {
    BUILDING: "BUILDING",
  },
  useMapStore: () => ({
    currentBuildingCode: mockCurrentBuildingCode,
    selectedBuildingCode: mockSelectedBuildingCode,
    setSelectedBuildingCode: mockSetSelectedBuildingCode,
    setCurrentMode: mockSetCurrentMode,
  }),
}));

jest.mock("@/hooks/useNavigationStore", () => ({
  __esModule: true,
  ModifyingFieldOptions: {
    start: "start",
  },
  useNavigationStore: () => ({
    startLocation: mockStartLocation,
    modifyingField: mockModifyingField,
  }),
}));

jest.mock("@/hooks/useStartLocation", () => ({
  __esModule: true,
  default: () => ({
    setStartLocationAutocomplete: mockSetStartLocationAutocomplete,
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
    mockShowBuildingPolygons = true;
    mockCurrentBuildingCode = "";
    mockSelectedBuildingCode = "";
    mockStartLocation = { code: "H" };
    mockModifyingField = undefined;
  });

  test("renders correct number of Polygon components for all buildings", () => {
    render(<CampusBuildingPolygons buildings={mockBuildings} />);

    expect(Polygon).toHaveBeenCalledTimes(mockBuildings.length);
  });

  test("returns null when map setting hides building polygons", () => {
    mockShowBuildingPolygons = false;

    const { toJSON } = render(<CampusBuildingPolygons buildings={mockBuildings} />);

    expect(toJSON()).toBeNull();
    expect(Polygon).not.toHaveBeenCalled();
  });

  test("applies campus style by default", () => {
    render(<CampusBuildingPolygons buildings={[mockBuildings[0]]} />);

    const props = (Polygon as jest.Mock).mock.calls[0][0];
    expect(props.fillColor).toBe(CAMPUS_BUILDING_STYLE.fillColor);
    expect(props.strokeColor).toBe(CAMPUS_BUILDING_STYLE.strokeColor);
    expect(props.strokeWidth).toBe(CAMPUS_BUILDING_STYLE.strokeWidth);
    expect(props.zIndex).toBe(CAMPUS_BUILDING_STYLE.zIndex);
  });

  test("applies current building style when building is current", () => {
    mockCurrentBuildingCode = "H";

    render(<CampusBuildingPolygons buildings={[mockBuildings[0]]} />);

    const props = (Polygon as jest.Mock).mock.calls[0][0];
    expect(props.fillColor).toBe(CURRENT_BUILDING_STYLE.fillColor);
    expect(props.strokeColor).toBe(CURRENT_BUILDING_STYLE.strokeColor);
    expect(props.strokeWidth).toBe(CURRENT_BUILDING_STYLE.strokeWidth);
    expect(props.zIndex).toBe(CURRENT_BUILDING_STYLE.zIndex);
  });

  test("applies selected style with precedence over current style", () => {
    mockCurrentBuildingCode = "H";
    mockSelectedBuildingCode = "H";

    render(<CampusBuildingPolygons buildings={[mockBuildings[0]]} />);

    const props = (Polygon as jest.Mock).mock.calls[0][0];
    expect(props.fillColor).toBe(SELECTED_BUILDING_STYLE.fillColor);
    expect(props.strokeColor).toBe(SELECTED_BUILDING_STYLE.strokeColor);
    expect(props.strokeWidth).toBe(SELECTED_BUILDING_STYLE.strokeWidth);
    expect(props.zIndex).toBe(SELECTED_BUILDING_STYLE.zIndex);
  });

  test("pressing polygon sets selected building and map mode by default", () => {
    render(<CampusBuildingPolygons buildings={mockBuildings} />);

    const firstPolygonProps = (Polygon as jest.Mock).mock.calls[0][0];
    firstPolygonProps.onPress();

    expect(mockSetSelectedBuildingCode).toHaveBeenCalledWith("H");
    expect(mockSetCurrentMode).toHaveBeenCalledWith(MapMode.BUILDING);
    expect(mockSetStartLocationAutocomplete).not.toHaveBeenCalled();
  });

  test("pressing polygon sets start location autocomplete when modifying start without start location", () => {
    mockStartLocation = undefined;
    mockModifyingField = ModifyingFieldOptions.start;

    render(<CampusBuildingPolygons buildings={mockBuildings} />);

    const secondPolygonProps = (Polygon as jest.Mock).mock.calls[1][0];
    secondPolygonProps.onPress();

    expect(mockSetStartLocationAutocomplete).toHaveBeenCalledWith("MB");
    expect(mockSetSelectedBuildingCode).not.toHaveBeenCalled();
    expect(mockSetCurrentMode).not.toHaveBeenCalled();
  });
});
