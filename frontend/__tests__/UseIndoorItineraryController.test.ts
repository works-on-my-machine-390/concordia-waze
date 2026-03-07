import { act, renderHook, waitFor } from "@testing-library/react-native";
import { useIndoorItineraryController } from "@/hooks/useIndoorItineraryController";
import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { TransitionType } from "@/hooks/queries/indoorDirectionsQueries";

jest.mock("@/hooks/useAccessibilityMode", () => ({
  useAccessibilityMode: jest.fn(),
}));

jest.mock("@/hooks/queries/indoorDirectionsQueries", () => {
  const actual = jest.requireActual("@/hooks/queries/indoorDirectionsQueries");
  return {
    ...actual,
    useIndoorMultiFloorPath: jest.fn(),
  };
});

jest.mock("@/hooks/queries/indoorMapQueries", () => ({
  useGetBuildingFloors: jest.fn(),
}));

import { useAccessibilityMode } from "@/hooks/useAccessibilityMode";
import { useIndoorMultiFloorPath } from "@/hooks/queries/indoorDirectionsQueries";
import { useGetBuildingFloors } from "@/hooks/queries/indoorMapQueries";

const mockedUseAccessibilityMode =
  useAccessibilityMode as unknown as jest.Mock;
const mockedUseIndoorMultiFloorPath =
  useIndoorMultiFloorPath as unknown as jest.Mock;
const mockedUseGetBuildingFloors =
  useGetBuildingFloors as unknown as jest.Mock;

const pointStart = {
  label: "Start Room",
  floor: 1,
  coord: { x: 0.1, y: 0.2 },
};

const pointEnd = {
  label: "End Room",
  floor: 2,
  coord: { x: 0.7, y: 0.8 },
};

const initialStoreState = {
  mode: "BROWSE" as const,
  pickMode: "start" as const,
  selectedRoom: null,
  start: null,
  end: null,
  routeSegments: null,
  totalDistance: null,
  transitionType: null,
  routeError: null,
  currentFloor: null,
};

describe("useIndoorItineraryController", () => {
  let mutateAsyncMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    useIndoorNavigationStore.setState(initialStoreState);

    mutateAsyncMock = jest.fn();

    mockedUseIndoorMultiFloorPath.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    });

    mockedUseAccessibilityMode.mockReturnValue({
      isAccessibilityMode: false,
    });

    mockedUseGetBuildingFloors.mockReturnValue({
      data: {
        floors: [
          { number: 1, imgPath: "floor1.svg" },
          { number: 2, imgPath: "floor2.svg" },
        ],
      },
    });

    (global as any).fetch = jest.fn().mockResolvedValue({
      text: async () => '<svg viewBox="0 0 1000 1000"></svg>',
    });
  });

  it("does not request a route when not in itinerary mode", () => {
    useIndoorNavigationStore.setState({
      mode: "BROWSE",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("does not request a route when start or end is missing", () => {
    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: null,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it("requests route with preferElevator false when accessibility mode is off", async () => {
    mutateAsyncMock.mockResolvedValue({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.2 },
            { x: 0.2, y: 0.2 },
          ],
        },
      ],
      totalDistance: 25,
      transitionType: TransitionType.Stairs,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      buildingCode: "VL",
      startFloor: 1,
      endFloor: 2,
      start: pointStart.coord,
      end: pointEnd.coord,
      preferElevator: false,
    });
  });

  it("requests route with preferElevator true when accessibility mode is on", async () => {
    mockedUseAccessibilityMode.mockReturnValue({
      isAccessibilityMode: true,
    });

    mutateAsyncMock.mockResolvedValue({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.2 },
            { x: 0.2, y: 0.2 },
          ],
        },
      ],
      totalDistance: 25,
      transitionType: TransitionType.Elevator,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledWith({
      buildingCode: "VL",
      startFloor: 1,
      endFloor: 2,
      start: pointStart.coord,
      end: pointEnd.coord,
      preferElevator: true,
    });
  });

  it("stores route, total distance, and transition type on success", async () => {
    const segments = [
      {
        floorNumber: 1,
        distance: 12,
        path: [
          { x: 0.1, y: 0.2 },
          { x: 0.4, y: 0.2 },
        ],
      },
    ];

    mutateAsyncMock.mockResolvedValue({
      segments,
      totalDistance: 42,
      transitionType: TransitionType.Elevator,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
      routeError: "old error",
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(useIndoorNavigationStore.getState().routeSegments).toEqual(segments);
    });

    const state = useIndoorNavigationStore.getState();
    expect(state.totalDistance).toBe(42);
    expect(state.transitionType).toBe(TransitionType.Elevator);
    expect(state.routeError).toBeNull();
  });

  it("falls back to computed meters when backend totalDistance is 0", async () => {
    const segments = [
      {
        floorNumber: 1,
        distance: 12,
        path: [
          { x: 0.1, y: 0.2 },
          { x: 0.4, y: 0.2 },
        ],
      },
    ];

    mutateAsyncMock.mockResolvedValue({
      segments,
      totalDistance: 0,
      transitionType: TransitionType.Stairs,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(useIndoorNavigationStore.getState().routeSegments).toEqual(segments);
    });

    expect(useIndoorNavigationStore.getState().totalDistance).toBeGreaterThan(0);
    expect(useIndoorNavigationStore.getState().transitionType).toBe(
      TransitionType.Stairs,
    );
  });

  it("sets accessible route error when accessibility mode is on and backend says no transition point", async () => {
    mockedUseAccessibilityMode.mockReturnValue({
      isAccessibilityMode: true,
    });

    mutateAsyncMock.mockRejectedValue(new Error("No transition point found"));

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
      routeSegments: [
        {
          floorNumber: 1,
          distance: 5,
          path: [
            { x: 0.1, y: 0.2 },
            { x: 0.2, y: 0.2 },
          ],
        },
      ],
      totalDistance: 11,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(useIndoorNavigationStore.getState().routeError).toBe(
        "No accessible indoor route is available for this trip.",
      );
    });

    expect(useIndoorNavigationStore.getState().routeSegments).toBeNull();
    expect(useIndoorNavigationStore.getState().totalDistance).toBeNull();
  });

  it("sets generic route error on generic failure", async () => {
    mutateAsyncMock.mockRejectedValue(new Error("network exploded"));

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
      expect(useIndoorNavigationStore.getState().routeError).toBe(
        "Unable to generate an indoor route.",
      );
    });

    expect(useIndoorNavigationStore.getState().routeSegments).toBeNull();
  });

  it("onPickPoint sets start and moves pickMode to end when pickMode is start", () => {
    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      pickMode: "start",
    });

    const { result } = renderHook(() => useIndoorItineraryController("VL"));

    act(() => {
      result.current.onPickPoint(pointStart);
    });

    const state = useIndoorNavigationStore.getState();
    expect(state.start).toEqual(pointStart);
    expect(state.pickMode).toBe("end");
    expect(state.routeSegments).toBeNull();
  });

  it("onPickPoint sets end when pickMode is end", () => {
    mutateAsyncMock.mockResolvedValue({
      segments: [],
      totalDistance: 0,
      transitionType: TransitionType.None,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      pickMode: "end",
      start: pointStart,
    });

    const { result } = renderHook(() => useIndoorItineraryController("VL"));

    act(() => {
      result.current.onPickPoint(pointEnd);
    });

    const state = useIndoorNavigationStore.getState();
    expect(state.end).toEqual(pointEnd);
    expect(state.routeSegments).toBeNull();
  });

  it("onPickPoint does nothing outside itinerary mode", () => {
    useIndoorNavigationStore.setState({
      mode: "BROWSE",
      pickMode: "start",
    });

    const { result } = renderHook(() => useIndoorItineraryController("VL"));

    act(() => {
      result.current.onPickPoint(pointStart);
    });

    const state = useIndoorNavigationStore.getState();
    expect(state.start).toBeNull();
    expect(state.end).toBeNull();
  });

  it("does not request the same route twice for the same key", async () => {
    mutateAsyncMock.mockResolvedValue({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.2 },
            { x: 0.2, y: 0.2 },
          ],
        },
      ],
      totalDistance: 25,
      transitionType: TransitionType.Stairs,
    });

    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      start: pointStart,
      end: pointEnd,
    });

    renderHook(() => useIndoorItineraryController("VL"));

    await waitFor(() => {
    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
    });

    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
  });
});