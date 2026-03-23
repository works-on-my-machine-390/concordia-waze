import {
  getDirectionsSequence,
  NavigationPhase,
  useNavigationStore,
} from "../hooks/useNavigationStore";
import { DirectionsResponseBlockType } from "../hooks/queries/navigationQueries";

describe("useNavigationStore", () => {
  beforeEach(() => {
    useNavigationStore.getState().clearState();
  });

  test("updates start and end locations", () => {
    useNavigationStore.getState().setStartLocation({
      name: "Start",
      latitude: 45.497,
      longitude: -73.579,
      code: "MB",
    });

    useNavigationStore.getState().setEndLocation({
      name: "End",
      latitude: 45.499,
      longitude: -73.581,
      code: "H",
    });

    expect(useNavigationStore.getState().startLocation).toEqual(
      expect.objectContaining({ name: "Start", code: "MB" }),
    );
    expect(useNavigationStore.getState().endLocation).toEqual(
      expect.objectContaining({ name: "End", code: "H" }),
    );
  });

  test("tracks navigation phase and current step indexes", () => {
    useNavigationStore.getState().setNavigationPhase?.(NavigationPhase.PREPARATION);
    useNavigationStore.getState().setCurrentOutdoorStepIndex?.(3);
    useNavigationStore.getState().setCurrentIndoorStepIndex?.(2);

    expect(useNavigationStore.getState().navigationPhase).toBe(
      NavigationPhase.PREPARATION,
    );
    expect(useNavigationStore.getState().currentOutdoorStepIndex).toBe(3);
    expect(useNavigationStore.getState().currentIndoorStepIndex).toBe(2);
  });

  test("clearState resets navigation fields to defaults", () => {
    useNavigationStore.getState().setStartLocation({
      name: "Start",
      latitude: 45.497,
      longitude: -73.579,
      code: "MB",
    });
    useNavigationStore.getState().setEndLocation({
      name: "End",
      latitude: 45.499,
      longitude: -73.581,
      code: "H",
    });
    useNavigationStore.getState().setNavigationPhase?.(NavigationPhase.ACTIVE);
    useNavigationStore.getState().setCurrentOutdoorStepIndex?.(4);

    useNavigationStore.getState().clearState();

    expect(useNavigationStore.getState().startLocation).toBeUndefined();
    expect(useNavigationStore.getState().endLocation).toBeUndefined();
    expect(useNavigationStore.getState().navigationPhase).toBeUndefined();
    expect(useNavigationStore.getState().currentOutdoorStepIndex).toBeUndefined();
    expect(useNavigationStore.getState().indoorNavigationSteps).toEqual([]);
  });
});

describe("getDirectionsSequence", () => {
  test("maps indoor and outdoor blocks by index and skips duration blocks", () => {
    const sequence = getDirectionsSequence([
      {
        type: DirectionsResponseBlockType.INDOOR,
        directions: {} as any,
      },
      {
        type: DirectionsResponseBlockType.OUTDOOR,
        directionsByMode: {},
      },
      {
        type: DirectionsResponseBlockType.DURATION,
        durations: {},
      },
    ] as any);

    expect(sequence).toEqual({
      0: "indoor",
      1: "outdoor",
    });
  });
});
