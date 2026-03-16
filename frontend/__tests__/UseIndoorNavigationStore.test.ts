import { useIndoorNavigationStore } from "@/hooks/useIndoorNavigationStore";
import { TransitionType } from "@/hooks/queries/indoorDirectionsQueries";

const pointA = {
  label: "A",
  floor: 1,
  coord: { x: 0.1, y: 0.2 },
};

const pointB = {
  label: "B",
  floor: 2,
  coord: { x: 0.3, y: 0.4 },
};

const initialState = {
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

describe("useIndoorNavigationStore", () => {
  beforeEach(() => {
    useIndoorNavigationStore.setState(initialState);
  });

  it("sets selected room", () => {
    useIndoorNavigationStore.getState().setSelectedRoom(pointA);
    expect(useIndoorNavigationStore.getState().selectedRoom).toEqual(pointA);
  });

  it("enterItineraryFromSelected moves selected room into end and resets route state", () => {
    useIndoorNavigationStore.setState({
      selectedRoom: pointB,
      routeError: "old error",
      routeSegments: [{ floorNumber: 1, distance: 10, path: [] }],
      totalDistance: 55,
      transitionType: TransitionType.Stairs,
    });

    useIndoorNavigationStore.getState().enterItineraryFromSelected();

    const state = useIndoorNavigationStore.getState();
    expect(state.mode).toBe("ITINERARY");
    expect(state.pickMode).toBe("start");
    expect(state.start).toBeNull();
    expect(state.end).toEqual(pointB);
    expect(state.selectedRoom).toBeNull();
    expect(state.routeSegments).toBeNull();
    expect(state.totalDistance).toBeNull();
    expect(state.transitionType).toBeNull();
    expect(state.routeError).toBeNull();
  });

  it("does nothing when entering itinerary with no selected room", () => {
    useIndoorNavigationStore.getState().enterItineraryFromSelected();
    expect(useIndoorNavigationStore.getState().mode).toBe("BROWSE");
  });

  it("setStart clears routeError", () => {
    useIndoorNavigationStore.setState({ routeError: "some error" });

    useIndoorNavigationStore.getState().setStart(pointA);

    const state = useIndoorNavigationStore.getState();
    expect(state.start).toEqual(pointA);
    expect(state.routeError).toBeNull();
  });

  it("setEnd clears routeError", () => {
    useIndoorNavigationStore.setState({ routeError: "some error" });

    useIndoorNavigationStore.getState().setEnd(pointB);

    const state = useIndoorNavigationStore.getState();
    expect(state.end).toEqual(pointB);
    expect(state.routeError).toBeNull();
  });

  it("setRoute stores segments, totalDistance, and transitionType and clears routeError", () => {
    useIndoorNavigationStore.setState({ routeError: "old error" });

    const segments = [
      {
        floorNumber: 1,
        distance: 12,
        path: [
          { x: 0.1, y: 0.1 },
          { x: 0.2, y: 0.2 },
        ],
      },
    ];

    useIndoorNavigationStore
      .getState()
      .setRoute(segments, 25.5, TransitionType.Elevator);

    const state = useIndoorNavigationStore.getState();
    expect(state.routeSegments).toEqual(segments);
    expect(state.totalDistance).toBe(25.5);
    expect(state.transitionType).toBe(TransitionType.Elevator);
    expect(state.routeError).toBeNull();
  });

  it("setRouteError stores the message", () => {
    useIndoorNavigationStore
      .getState()
      .setRouteError("No accessible indoor route is available for this trip.");

    expect(useIndoorNavigationStore.getState().routeError).toBe(
      "No accessible indoor route is available for this trip.",
    );
  });

  it("clearRoute clears route data and error", () => {
    useIndoorNavigationStore.setState({
      routeSegments: [{ floorNumber: 1, distance: 12, path: [] }],
      totalDistance: 100,
      transitionType: TransitionType.Stairs,
      routeError: "some error",
    });

    useIndoorNavigationStore.getState().clearRoute();

    const state = useIndoorNavigationStore.getState();
    expect(state.routeSegments).toBeNull();
    expect(state.totalDistance).toBeNull();
    expect(state.transitionType).toBeNull();
    expect(state.routeError).toBeNull();
  });

  it("setCurrentFloor is a no-op when the value is unchanged", () => {
    useIndoorNavigationStore.getState().setCurrentFloor(2);

    const stateAfterFirstSet = useIndoorNavigationStore.getState();

    stateAfterFirstSet.setCurrentFloor(2);

    expect(useIndoorNavigationStore.getState()).toBe(stateAfterFirstSet);
    expect(useIndoorNavigationStore.getState().currentFloor).toBe(2);
  });

  it("exitItinerary resets everything back to browse mode", () => {
    useIndoorNavigationStore.setState({
      mode: "ITINERARY",
      pickMode: "end",
      start: pointA,
      end: pointB,
      selectedRoom: pointA,
      routeSegments: [{ floorNumber: 1, distance: 12, path: [] }],
      totalDistance: 44,
      transitionType: TransitionType.Elevator,
      routeError: "error",
    });

    useIndoorNavigationStore.getState().exitItinerary();

    const state = useIndoorNavigationStore.getState();
    expect(state.mode).toBe("BROWSE");
    expect(state.pickMode).toBe("start");
    expect(state.start).toBeNull();
    expect(state.end).toBeNull();
    expect(state.selectedRoom).toBeNull();
    expect(state.routeSegments).toBeNull();
    expect(state.totalDistance).toBeNull();
    expect(state.transitionType).toBeNull();
    expect(state.routeError).toBeNull();
  });
});