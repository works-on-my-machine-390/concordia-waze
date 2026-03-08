import { act, renderHook } from "@testing-library/react-native";
import { useAccessibilityMode } from "../hooks/useAccessibilityMode";

describe("useAccessibilityMode", () => {
  beforeEach(() => {
    useAccessibilityMode.setState({ isAccessibilityMode: false });
  });

  test("initial state is false", () => {
    const { result } = renderHook(() => useAccessibilityMode());
    expect(result.current.isAccessibilityMode).toBe(false);
  });

  test("toggleAccessibilityMode flips the state", () => {
    const { result } = renderHook(() => useAccessibilityMode());
    act(() => {
      result.current.toggleAccessibilityMode();
    });
    expect(result.current.isAccessibilityMode).toBe(true);
  });

  test("toggleAccessibilityMode toggles back to false", () => {
    const { result } = renderHook(() => useAccessibilityMode());
    act(() => {
      result.current.toggleAccessibilityMode();
      result.current.toggleAccessibilityMode();
    });
    expect(result.current.isAccessibilityMode).toBe(false);
  });

  test("setAccessibilityMode sets to true", () => {
    const { result } = renderHook(() => useAccessibilityMode());
    act(() => {
      result.current.setAccessibilityMode(true);
    });
    expect(result.current.isAccessibilityMode).toBe(true);
  });

  test("setAccessibilityMode sets to false", () => {
    const { result } = renderHook(() => useAccessibilityMode());
    act(() => {
      result.current.setAccessibilityMode(true);
      result.current.setAccessibilityMode(false);
    });
    expect(result.current.isAccessibilityMode).toBe(false);
  });
});