import { renderHook, act, waitFor } from "@testing-library/react-native";
import { useIndoorSearch } from "../hooks/useIndoorSearch";

jest.mock("../hooks/queries/userQueries", () => ({
  useGetProfile: jest.fn(),
}));

jest.mock("../hooks/queries/userHistoryQueries", () => ({
  useSaveToHistory: jest.fn(),
  useGetUserHistory: jest.fn(),
  useClearUserHistory: jest.fn(),
}));

jest.mock("../hooks/guestStorage", () => ({
  getGuestSearchHistory: jest.fn(),
  addGuestSearchHistory: jest.fn(),
  clearGuestSearchHistory: jest.fn(),
}));

jest.mock("../app/utils/indoorNameFormattingUtils", () => ({
  extractFloorFromAddress: jest.fn(),
}));

import { useGetProfile } from "../hooks/queries/userQueries";
import {
  useSaveToHistory,
  useGetUserHistory,
  useClearUserHistory,
} from "../hooks/queries/userHistoryQueries";
import {
  getGuestSearchHistory,
  addGuestSearchHistory,
  clearGuestSearchHistory,
} from "../hooks/guestStorage";
import { extractFloorFromAddress } from "../app/utils/indoorNameFormattingUtils";

describe("useIndoorSearch", () => {
  const mockFloor = {
    id: "1",
    level: 2,
    pois: [
      { id: "1", name: "210", type: "room" },
      { id: "2", name: "Library", type: "study_space" },
      { id: "3", name: "POI_123", type: "bathroom" },
    ],
  };

  const floors = [mockFloor];

  beforeEach(() => {
    jest.clearAllMocks();

    (getGuestSearchHistory as jest.Mock).mockResolvedValue([]);
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });
    (useSaveToHistory as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (useClearUserHistory as jest.Mock).mockReturnValue({ mutate: jest.fn() });
    (extractFloorFromAddress as jest.Mock).mockReturnValue(0);
  });

  test("returns empty results when query is empty", () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "", "MB"),
    );

    expect(result.current.results).toEqual([]);
  });

  test("matches room names correctly", () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "210", "MB"),
    );

    expect(result.current.results.length).toBe(1);
    expect(result.current.results[0].poi.name).toBe("210");
    expect(result.current.results[0].type).toBe("room");
  });

  test("matches POI type correctly", () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "study", "MB"),
    );

    expect(result.current.results.length).toBe(1);
    expect(result.current.results[0].poi.name).toBe("Library");
  });

  test("cleans building prefix from query", () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "MB210", "MB"),
    );

    expect(result.current.results.length).toBe(1);
    expect(result.current.results[0].poi.name).toBe("210");
  });

  test("loads guest recent searches", async () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    (getGuestSearchHistory as jest.Mock).mockResolvedValue([
      { query: "210", locations: "MB - Floor 2" },
    ]);

    (extractFloorFromAddress as jest.Mock).mockReturnValue(2);

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "", "MB"),
    );

    await waitFor(() => expect(result.current.recentSearches.length).toBe(1));

    expect(result.current.recentSearches[0]).toEqual({
      displayName: "210",
      floor: 2,
    });
  });

  test("adds guest recent search", async () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "", "MB"),
    );

    await act(async () => {
      await result.current.addRecentSearch("210", "210", 2);
    });

    expect(addGuestSearchHistory).toHaveBeenCalled();
    expect(result.current.recentSearches[0]).toEqual({
      displayName: "210",
      floor: 2,
    });
  });

  test("clears guest recent searches", async () => {
    (useGetProfile as jest.Mock).mockReturnValue({ data: null });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "", "MB"),
    );

    await act(async () => {
      await result.current.clearRecentSearches();
    });

    expect(clearGuestSearchHistory).toHaveBeenCalled();
    expect(result.current.recentSearches).toEqual([]);
  });

  test("adds user history when logged in", async () => {
    const mutate = jest.fn();

    (useGetProfile as jest.Mock).mockReturnValue({
      data: { id: "123" },
    });

    (useSaveToHistory as jest.Mock).mockReturnValue({ mutate });
    (useGetUserHistory as jest.Mock).mockReturnValue({ data: [] });
    (useClearUserHistory as jest.Mock).mockReturnValue({ mutate: jest.fn() });

    const { result } = renderHook(() =>
      useIndoorSearch(floors as any, "", "MB"),
    );

    await act(async () => {
      await result.current.addRecentSearch("210", "210", 2);
    });

    expect(mutate).toHaveBeenCalled();
  });
});
