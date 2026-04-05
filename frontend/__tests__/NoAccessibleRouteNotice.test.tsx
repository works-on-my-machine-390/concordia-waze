import { COLORS } from "@/app/constants";
import { Animated } from "react-native";
import { render } from "@testing-library/react-native";
import NoAccessibleRouteNotice from "../components/indoor/NoAccessibleRouteNotice";

const mockWheelchairIcon = jest.fn(() => null);

jest.mock("@/app/icons", () => ({
  WheelchairIcon: (props: unknown) => mockWheelchairIcon(props),
}));

describe("NoAccessibleRouteNotice", () => {
  const mockTiming = jest.spyOn(Animated, "timing");
  const mockParallel = jest.spyOn(Animated, "parallel");
  const mockParallelStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockTiming.mockImplementation(
      () =>
        ({
          start: jest.fn(),
          stop: jest.fn(),
          reset: jest.fn(),
        }) as any,
    );

    mockParallel.mockImplementation(
      () =>
        ({
          start: mockParallelStart,
          stop: jest.fn(),
          reset: jest.fn(),
        }) as any,
    );
  });

  afterAll(() => {
    mockTiming.mockRestore();
    mockParallel.mockRestore();
  });

  test("renders alert content and icon", () => {
    const { getByText, UNSAFE_getByType } = render(
      <NoAccessibleRouteNotice visible={true} />,
    );

    const banner = UNSAFE_getByType(Animated.View);

    expect(banner.props.pointerEvents).toBe("auto");
    expect(getByText("No accessible route")).toBeTruthy();
    expect(
      getByText("No elevator on this floor", { exact: false }),
    ).toBeTruthy();
    expect(mockWheelchairIcon).toHaveBeenCalledWith(
      expect.objectContaining({ size: 14, color: COLORS.surface }),
    );
  });

  test("uses visible=true animation timing values on mount", () => {
    render(<NoAccessibleRouteNotice visible={true} />);

    expect(mockTiming).toHaveBeenCalledTimes(2);
    expect(mockTiming.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        toValue: 1,
        duration: 260,
        useNativeDriver: true,
      }),
    );
    expect(mockTiming.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }),
    );
    expect(mockParallelStart).toHaveBeenCalledTimes(1);
  });

  test("updates pointer events and animation values when hidden", () => {
    const { UNSAFE_getByType, rerender } = render(
      <NoAccessibleRouteNotice visible={true} />,
    );

    rerender(<NoAccessibleRouteNotice visible={false} />);

    const banner = UNSAFE_getByType(Animated.View);

    expect(banner.props.pointerEvents).toBe("none");
    expect(mockTiming).toHaveBeenCalledTimes(4);
    expect(mockTiming.mock.calls[2][1]).toEqual(
      expect.objectContaining({
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    );
    expect(mockTiming.mock.calls[3][1]).toEqual(
      expect.objectContaining({
        toValue: -10,
        duration: 180,
        useNativeDriver: true,
      }),
    );
  });
});