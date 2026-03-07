import {
  buildIndoorNavigationSteps,
  estimateDurationMinutes,
  formatArrivalTimeFromNow,
} from "@/app/utils/indoorNavigationSteps";
import { TransitionType } from "@/hooks/queries/indoorDirectionsQueries";

describe("indoorNavigationSteps", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    (global as any).fetch = jest.fn().mockResolvedValue({
      text: async () => '<svg viewBox="0 0 1000 1000"></svg>',
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("builds walk + arrival for same-floor straight path", async () => {
    const steps = await buildIndoorNavigationSteps({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.1 },
          ],
        },
      ],
      floors: [{ number: 1, imgPath: "floor1.svg" }] as any,
      transitionType: TransitionType.None,
      exactTotalDistanceMeters: 30,
    });

    expect(steps).toHaveLength(2);
    expect(steps[0].kind).toBe("walk");
    expect(steps[0].instruction).toBe("Head straight");
    expect(steps[1].kind).toBe("arrival");
    expect(steps[1].instruction).toBe("You have arrived");
    expect(steps[1].distanceMeters).toBe(0);
  });

  it("builds turn + walk + arrival for last segment with a real turn", async () => {
    const steps = await buildIndoorNavigationSteps({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.1 },
            { x: 0.4, y: 0.4 },
          ],
        },
      ],
      floors: [{ number: 1, imgPath: "floor1.svg" }] as any,
      transitionType: TransitionType.None,
      exactTotalDistanceMeters: 60,
    });

    expect(steps).toHaveLength(3);
    expect(steps[0].kind).toBe("turn");
    expect(steps[1].kind).toBe("walk");
    expect(steps[1].instruction).toBe("Continue straight");
    expect(steps[2].kind).toBe("arrival");
  });

  it("builds transition step for non-last segment", async () => {
    const steps = await buildIndoorNavigationSteps({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.1 },
          ],
        },
        {
          floorNumber: 2,
          distance: 10,
          path: [
            { x: 0.2, y: 0.2 },
            { x: 0.5, y: 0.2 },
          ],
        },
      ],
      floors: [
        { number: 1, imgPath: "floor1.svg" },
        { number: 2, imgPath: "floor2.svg" },
      ] as any,
      transitionType: TransitionType.Elevator,
      exactTotalDistanceMeters: 40,
    });

    expect(steps[0].kind).toBe("transition");
    expect(steps[0].instruction).toBe("Take the elevator to Floor 2");
    expect(steps[steps.length - 1].kind).toBe("arrival");
  });

  it("ignores tiny bends and still produces straight walk + arrival", async () => {
    const steps = await buildIndoorNavigationSteps({
      segments: [
        {
          floorNumber: 1,
          distance: 10,
          path: [
            { x: 0.1, y: 0.1 },
            { x: 0.4, y: 0.1 },
            { x: 0.7, y: 0.11 },
          ],
        },
      ],
      floors: [{ number: 1, imgPath: "floor1.svg" }] as any,
      transitionType: TransitionType.None,
      exactTotalDistanceMeters: 30,
    });

    expect(steps).toHaveLength(2);
    expect(steps[0].kind).toBe("walk");
    expect(steps[1].kind).toBe("arrival");
  });

  it("returns empty array when no valid segments are available", async () => {
    const steps = await buildIndoorNavigationSteps({
      segments: [
        {
          floorNumber: 1,
          distance: 0,
          path: [{ x: 0.1, y: 0.1 }],
        },
      ],
      floors: [{ number: 1, imgPath: "floor1.svg" }] as any,
      transitionType: TransitionType.None,
    });

    expect(steps).toEqual([]);
  });

  it("estimateDurationMinutes returns at least 1", () => {
    expect(estimateDurationMinutes(0)).toBe(1);
  });

  it("formatArrivalTimeFromNow returns hh:mm", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-03-07T10:15:00"));

    const result = formatArrivalTimeFromNow(100);

    expect(result).toMatch(/^\d{2}:\d{2}$/);
  });
});