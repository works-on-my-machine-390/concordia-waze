import { COLORS } from "@/app/constants";
import { fireEvent, render } from "@testing-library/react-native";
import IndoorPoiFilters from "../components/indoor/IndoorPoiFilters";

const iconMockFactory = () => jest.fn((props: unknown) => null);

const mockBathroomIcon = iconMockFactory();
const mockStairsIcon = iconMockFactory();
const mockElevatorIcon = iconMockFactory();
const mockStudySpotIcon = iconMockFactory();
const mockSittingAreaIcon = iconMockFactory();
const mockLockersIcon = iconMockFactory();
const mockSlopeUpIcon = iconMockFactory();
const mockFireEscapeIcon = iconMockFactory();
const mockSecurityIcon = iconMockFactory();
const mockCirculationDeskIcon = iconMockFactory();
const mockReferenceDeskIcon = iconMockFactory();
const mockExitIcon = iconMockFactory();

jest.mock("@/app/icons", () => ({
  BathroomIcon: (props: unknown) => mockBathroomIcon(props),
  StairsIcon: (props: unknown) => mockStairsIcon(props),
  ElevatorIcon: (props: unknown) => mockElevatorIcon(props),
  StudySpotIcon: (props: unknown) => mockStudySpotIcon(props),
  SittingAreaIcon: (props: unknown) => mockSittingAreaIcon(props),
  LockersIcon: (props: unknown) => mockLockersIcon(props),
  SlopeUpIcon: (props: unknown) => mockSlopeUpIcon(props),
  FireEscapeIcon: (props: unknown) => mockFireEscapeIcon(props),
  SecurityIcon: (props: unknown) => mockSecurityIcon(props),
  CirculationDeskIcon: (props: unknown) => mockCirculationDeskIcon(props),
  ReferenceDeskIcon: (props: unknown) => mockReferenceDeskIcon(props),
  ExitIcon: (props: unknown) => mockExitIcon(props),
}));

describe("IndoorPoiFilters", () => {
  const expectedFilters: Array<{ label: string; type: string }> = [
    { label: "Bathrooms", type: "bathroom" },
    { label: "Stairs", type: "stairs" },
    { label: "Elevators", type: "elevator" },
    { label: "Study Spots", type: "study_spot" },
    { label: "Sitting Areas", type: "sitting_area" },
    { label: "Lockers", type: "lockers" },
    { label: "Ramps", type: "ramp" },
    { label: "Fire Escapes", type: "fire_escape" },
    { label: "Security", type: "campus_security" },
    { label: "Circulation Desk", type: "circulation_desk" },
    { label: "Reference Desk", type: "reference_desk" },
    { label: "Exit", type: "exit" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders all indoor POI filter chips", () => {
    const onFilterPress = jest.fn();

    const { getByText } = render(<IndoorPoiFilters onFilterPress={onFilterPress} />);

    expectedFilters.forEach((filter) => {
      expect(getByText(filter.label)).toBeTruthy();
    });
  });

  test("calls onFilterPress with expected type and label for each chip", () => {
    const onFilterPress = jest.fn();

    const { getByText } = render(<IndoorPoiFilters onFilterPress={onFilterPress} />);

    expectedFilters.forEach((filter) => {
      fireEvent.press(getByText(filter.label));
      expect(onFilterPress).toHaveBeenCalledWith(filter.type, filter.label);
    });

    expect(onFilterPress).toHaveBeenCalledTimes(expectedFilters.length);
  });

  test("renders icons with shared size and text color", () => {
    const onFilterPress = jest.fn();

    render(<IndoorPoiFilters onFilterPress={onFilterPress} />);

    const iconMocks = [
      mockBathroomIcon,
      mockStairsIcon,
      mockElevatorIcon,
      mockStudySpotIcon,
      mockSittingAreaIcon,
      mockLockersIcon,
      mockSlopeUpIcon,
      mockFireEscapeIcon,
      mockSecurityIcon,
      mockCirculationDeskIcon,
      mockReferenceDeskIcon,
      mockExitIcon,
    ];

    iconMocks.forEach((mockIcon) => {
      expect(mockIcon).toHaveBeenCalledWith(
        expect.objectContaining({ size: 16, color: COLORS.textPrimary }),
      );
    });
  });
});