import { useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useSvgDimensions } from "../hooks/useSvgDimensions";

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("@/hooks/api", () => ({
  API_URL: "https://test-api.com",
}));

describe("useSvgDimensions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    (console.error as jest.Mock).mockRestore();
  });

  test("returns null dimensions when imgPath is undefined", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions(undefined));

    expect(result.current.dimensions).toBeNull();
    expect(result.current.svgText).toBeNull();
    expect(result.current.error).toBe(false);
    expect(result.current.isLoading).toBe(false);
  });

  test("returns loading state when fetching SVG", () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_1.svg"));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dimensions).toBeNull();
  });

  test("parses dimensions from viewBox attribute", async () => {
    const svgText = '<svg viewBox="0 0 1000 800"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_1.svg"));

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({ width: 1000, height: 800 });
    });
  });

  test("parses dimensions from width and height attributes when viewBox is missing", async () => {
    const svgText = '<svg width="500" height="600"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/CC_1.svg"));

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({ width: 500, height: 600 });
    });
  });

  test("handles viewBox with comma separators", async () => {
    const svgText = '<svg viewBox="0,0,1200,900"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_2.svg"));

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({ width: 1200, height: 900 });
    });
  });

  test("handles decimal dimensions", async () => {
    const svgText = '<svg viewBox="0 0 1000.5 800.75"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/VL_3.svg"));

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({
        width: 1000.5,
        height: 800.75,
      });
    });
  });

  test("sets error when dimensions are invalid", async () => {
    const svgText = '<svg viewBox="invalid"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/bad.svg"));

    await waitFor(() => {
      expect(result.current.error).toBe(true);
      expect(result.current.dimensions).toBeNull();
    });
  });

  test("sets error when width or height is NaN", async () => {
    const svgText = '<svg width="abc" height="def"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useSvgDimensions("floormaps/invalid.svg"),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });
  });

  test("sets error when width or height is zero", async () => {
    const svgText = '<svg viewBox="0 0 0 0"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() =>
      useSvgDimensions("floormaps/empty.svg"),
    );

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });
  });

  test("handles SVG with both viewBox and width/height attributes", async () => {
    const svgText =
      '<svg viewBox="0 0 1000 800" width="500" height="400"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_8.svg"));

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({ width: 1000, height: 800 });
    });
  });

  test("returns svgText from query result", async () => {
    const svgText = '<svg viewBox="0 0 1000 800"></svg>';

    (useQuery as jest.Mock).mockReturnValue({
      data: svgText,
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_9.svg"));

    await waitFor(() => {
      expect(result.current.svgText).toBe(svgText);
    });
  });

  test("resets dimensions when svgText becomes null", async () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: '<svg viewBox="0 0 1000 800"></svg>',
      isLoading: false,
    });

    const { result, rerender } = renderHook(
      ({ imgPath }) => useSvgDimensions(imgPath),
      { initialProps: { imgPath: "floormaps/H_1.svg" } },
    );

    await waitFor(() => {
      expect(result.current.dimensions).toEqual({ width: 1000, height: 800 });
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: null,
      isLoading: false,
    });

    rerender({ imgPath: undefined });

    await waitFor(() => {
      expect(result.current.dimensions).toBeNull();
    });
  });

  test("clears error when valid SVG is loaded", async () => {
    (useQuery as jest.Mock).mockReturnValue({
      data: "<svg></svg>",
      isLoading: false,
    });

    const { result } = renderHook(() => useSvgDimensions("floormaps/H_1.svg"));

    await waitFor(() => {
      expect(result.current.error).toBe(true);
    });

    (useQuery as jest.Mock).mockReturnValue({
      data: '<svg viewBox="0 0 1000 800"></svg>',
      isLoading: false,
    });

    const { result: result2 } = renderHook(() =>
      useSvgDimensions("floormaps/H_1.svg"),
    );

    await waitFor(() => {
      expect(result2.current.error).toBe(false);
      expect(result2.current.dimensions).toEqual({ width: 1000, height: 800 });
    });
  });
});
