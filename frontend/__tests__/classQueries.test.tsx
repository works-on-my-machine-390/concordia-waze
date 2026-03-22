import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import { useGetNextClass } from "../hooks/queries/classQueries";

jest.mock("../hooks/api", () => ({
  api: jest.fn(async () => ({
    get: jest.fn(() => ({
      json: jest.fn().mockResolvedValue({
        className: "SOEN 363",
        buildingLatitude: 45.49,
        buildingLongitude: -73.57,
        floorNumber: 2,
        roomX: 0,
        roomY: 0,
        item: {
          type: "Lecture",
          section: "WW",
          day: "FRI",
          startTime: "16:00",
          endTime: "17:15",
          buildingCode: "MB",
          room: "S2.210",
          origin: "manual",
        },
      }),
    })),
  })),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useGetNextClass", () => {
  test("does not fetch when disabled", () => {
    const { result } = renderHook(() => useGetNextClass(false), {
      wrapper: createWrapper(),
    });

    expect(result.current.data).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
  });

  test("fetches next class when enabled", async () => {
    const { result } = renderHook(() => useGetNextClass(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data?.className).toBe("SOEN 363");
    });
  });

  test("returns correct class data shape", async () => {
    const { result } = renderHook(() => useGetNextClass(true), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.data).toMatchObject({
        className: "SOEN 363",
        buildingLatitude: 45.49,
        item: {
          buildingCode: "MB",
          room: "S2.210",
          startTime: "16:00",
        },
      });
    });
  });
});
