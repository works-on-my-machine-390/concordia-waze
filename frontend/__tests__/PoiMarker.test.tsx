import type { PointOfInterest } from "@/hooks/queries/indoorMapQueries";
import { renderWithProviders } from "@/test_utils/renderUtils";
import PoiMarker from "../components/indoor/PoiMarker";

jest.mock("@/app/icons", () => {
  const { View } = require("react-native");
  return {
    StairsIcon: ({ size, color }: any) => (
      <View
        testID="stairs-icon"
        accessibilityLabel={`stairs-${size}-${color}`}
      />
    ),
    BathroomIcon: ({ size, color }: any) => (
      <View
        testID="bathroom-icon"
        accessibilityLabel={`bathroom-${size}-${color}`}
      />
    ),
    ElevatorIcon: ({ size, color }: any) => (
      <View
        testID="elevator-icon"
        accessibilityLabel={`elevator-${size}-${color}`}
      />
    ),
    FireEscapeIcon: ({ size, color }: any) => (
      <View
        testID="fire-escape-icon"
        accessibilityLabel={`fire-escape-${size}-${color}`}
      />
    ),
    StudySpotIcon: ({ size, color }: any) => (
      <View
        testID="study-spot-icon"
        accessibilityLabel={`study-spot-${size}-${color}`}
      />
    ),
    LockersIcon: ({ size, color }: any) => (
      <View
        testID="lockers-icon"
        accessibilityLabel={`lockers-${size}-${color}`}
      />
    ),
    SittingAreaIcon: ({ size, color }: any) => (
      <View
        testID="sitting-area-icon"
        accessibilityLabel={`sitting-area-${size}-${color}`}
      />
    ),
    SecurityIcon: ({ size, color }: any) => (
      <View
        testID="security-icon"
        accessibilityLabel={`security-${size}-${color}`}
      />
    ),
    SlopeUpIcon: ({ size, color }: any) => (
      <View testID="ramp-icon" accessibilityLabel={`ramp-${size}-${color}`} />
    ),
    CirculationDeskIcon: ({ size, color }: any) => (
      <View
        testID="circulation-desk-icon"
        accessibilityLabel={`circulation-desk-${size}-${color}`}
      />
    ),
    ReferenceDeskIcon: ({ size, color }: any) => (
      <View
        testID="reference-desk-icon"
        accessibilityLabel={`reference-desk-${size}-${color}`}
      />
    ),
  };
});

const createPoi = (type: string): PointOfInterest => ({
  name: `Test ${type}`,
  type,
  position: { x: 0.5, y: 0.5 },
  polygon: [],
  floor_number: 1,
  latitude: 45.497,
  longitude: -73.579,
  building: "CC",
});

describe("PoiMarker", () => {
  const defaultProps = {
    width: 1000,
    height: 1000,
  };

  test("renders stairs icon for stairs type", () => {
    const poi = createPoi("stairs");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("stairs-icon")).toBeTruthy();
  });

  test("renders bathroom icon for bathroom type", () => {
    const poi = createPoi("bathroom");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("bathroom-icon")).toBeTruthy();
  });

  test("renders elevator icon for elevator type", () => {
    const poi = createPoi("elevator");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("elevator-icon")).toBeTruthy();
  });

  test("renders fire escape icon for fire_escape type", () => {
    const poi = createPoi("fire_escape");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("fire-escape-icon")).toBeTruthy();
  });

  test("renders study spot icon for study_spot type", () => {
    const poi = createPoi("study_spot");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("study-spot-icon")).toBeTruthy();
  });

  test("renders lockers icon for lockers type", () => {
    const poi = createPoi("lockers");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("lockers-icon")).toBeTruthy();
  });

  test("handles case insensitive poi types", () => {
    const poi = createPoi("STAIRS");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("stairs-icon")).toBeTruthy();
  });

  test("handles poi types with spaces", () => {
    const poi = createPoi("study spot");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("study-spot-icon")).toBeTruthy();
  });

  test("returns null for unknown poi type", () => {
    const poi = createPoi("unknown_type");
    const { toJSON } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(toJSON()).toBeNull();
  });

  test("positions marker at correct coordinates", () => {
    const poi: PointOfInterest = {
      name: "Test Stairs",
      type: "stairs",
      position: { x: 0.25, y: 0.75 },
      polygon: [],
      floor_number: 1,
      latitude: 45.497,
      longitude: -73.579,
      building: "CC",
    };

    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} width={1000} height={1000} />,
    );

    expect(getByTestId("stairs-icon")).toBeTruthy();
  });

  test("centers icon on position coordinates", () => {
    const poi: PointOfInterest = {
      name: "Test Bathroom",
      type: "bathroom",
      position: { x: 0.5, y: 0.5 },
      polygon: [],
      floor_number: 1,
      latitude: 45.497,
      longitude: -73.579,
      building: "CC",
    };

    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} width={1000} height={1000} />,
    );

    expect(getByTestId("bathroom-icon")).toBeTruthy();
  });

  test("passes correct size and color to icon component", () => {
    const poi = createPoi("elevator");
    const { getByLabelText } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByLabelText("elevator-20-#7f2730")).toBeTruthy();
  });

  test("changes icon color when selected", () => {
    const poi = createPoi("elevator");
    const { getByLabelText } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} highlighted={true} />,
    );

    expect(getByLabelText("elevator-20-#4180c0")).toBeTruthy();
  });

  test("renders sitting area icon for sitting_area type", () => {
    const poi = createPoi("sitting_area");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("sitting-area-icon")).toBeTruthy();
  });

  test("renders security icon for campus_security type", () => {
    const poi = createPoi("campus_security");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("security-icon")).toBeTruthy();
  });

  test("renders ramp icon for ramp type", () => {
    const poi = createPoi("ramp");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("ramp-icon")).toBeTruthy();
  });

  test("renders circulation desk icon for circulation_desk type", () => {
    const poi = createPoi("circulation_desk");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("circulation-desk-icon")).toBeTruthy();
  });

  test("renders reference desk icon for reference_desk type", () => {
    const poi = createPoi("reference_desk");
    const { getByTestId } = renderWithProviders(
      <PoiMarker poi={poi} {...defaultProps} />,
    );

    expect(getByTestId("reference-desk-icon")).toBeTruthy();
  });
});
