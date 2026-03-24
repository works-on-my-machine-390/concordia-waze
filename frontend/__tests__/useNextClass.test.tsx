import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react-native";
import * as guestStorage from "@/hooks/guestStorage";
import * as classQueries from "@/hooks/queries/classQueries";
import { useNextClass } from "@/hooks/useNextClass";

jest.mock("@/hooks/queries/classQueries");
jest.mock("@/hooks/guestStorage");
jest.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    checkToken: jest.fn().mockResolvedValue(false), // default to guest
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockDate = (day: number, hour: number, minute: number) => {
  const date = new Date(2026, 0, 4 + day, hour, minute);
  jest.spyOn(globalThis, "Date").mockImplementation(() => date as any);
};

afterEach(() => {
  jest.restoreAllMocks();
});

describe("useNextClass", () => {
  describe("authenticated user", () => {
    beforeEach(() => {
      jest.mock("@/hooks/useAuth", () => ({
        useAuth: () => ({
          checkToken: jest.fn().mockResolvedValue(true),
        }),
      }));
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([]);
    });

    test("returns data from useGetNextClass", () => {
      const mockNextClass = {
        className: "SOEN 363",
        buildingLatitude: 45.49,
        buildingLongitude: -73.57,
        floorNumber: 2,
        roomX: 0,
        roomY: 0,
        item: {
          type: "Lecture" as const,
          section: "WW",
          day: "FRI",
          startTime: "16:00",
          endTime: "17:15",
          buildingCode: "MB",
          room: "S2.210",
          origin: "manual" as const,
        },
      };

      (classQueries.useGetNextClass as jest.Mock).mockReturnValue({
        data: mockNextClass,
        isLoading: false,
        isError: false,
      });

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      expect(result.current.nextClass).toEqual(mockNextClass);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isError).toBe(false);
    });

    test("returns isLoading true while fetching", () => {
      (classQueries.useGetNextClass as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
      });

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
      expect(result.current.nextClass).toBeNull();
    });

    test("returns isError true when fetch fails", () => {
      (classQueries.useGetNextClass as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
      });

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isError).toBe(true);
    });
  });

  describe("guest user", () => {
    beforeEach(() => {
      (classQueries.useGetNextClass as jest.Mock).mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: false,
      });
    });

    test("returns null when no courses stored", async () => {
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.nextClass).toBeNull();
      });
    });

    test("returns null when no classes today", async () => {
      mockDate(5, 15, 0);
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([
        {
          name: "SOEN 363",
          classes: [
            {
              type: "Lecture" as const,
              section: "WW",
              day: "MON",
              startTime: "16:00",
              endTime: "17:15",
              buildingCode: "MB",
              room: "S2.210",
              origin: "manual" as const,
            },
          ],
        },
      ]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.nextClass).toBeNull();
      });
    });

    test("returns null when all classes today have ended", async () => {
      mockDate(5, 18, 0);
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([
        {
          name: "SOEN 363",
          classes: [
            {
              type: "Lecture" as const,
              section: "WW",
              day: "FRI",
              startTime: "16:00",
              endTime: "17:15",
              buildingCode: "MB",
              room: "S2.210",
              origin: "manual" as const,
            },
          ],
        },
      ]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.nextClass).toBeNull();
      });
    });

    test("returns next class that has not ended yet", async () => {
      mockDate(5, 16, 30);
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([
        {
          name: "SOEN 363",
          classes: [
            {
              type: "Lecture" as const,
              section: "WW",
              day: "FRI",
              startTime: "16:00",
              endTime: "17:15",
              buildingCode: "MB",
              room: "S2.210",
              origin: "manual" as const,
            },
          ],
        },
      ]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.nextClass).not.toBeNull();
        expect(result.current.nextClass?.className).toBe("SOEN 363");
        expect(result.current.nextClass?.item.startTime).toBe("16:00");
      });
    });

    test("returns earliest class when multiple classes today", async () => {
      mockDate(5, 10, 0);
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([
        {
          name: "SOEN 363",
          classes: [
            {
              type: "Lecture" as const,
              section: "WW",
              day: "FRI",
              startTime: "16:00",
              endTime: "17:15",
              buildingCode: "MB",
              room: "S2.210",
              origin: "manual" as const,
            },
          ],
        },
        {
          name: "COMP 346",
          classes: [
            {
              type: "Lecture" as const,
              section: "CC",
              day: "FRI",
              startTime: "13:00",
              endTime: "14:15",
              buildingCode: "H",
              room: "820",
              origin: "manual" as const,
            },
          ],
        },
      ]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.nextClass?.className).toBe("COMP 346");
        expect(result.current.nextClass?.item.startTime).toBe("13:00");
      });
    });

    test("isError is always false for guest user", async () => {
      (guestStorage.getGuestCourses as jest.Mock).mockResolvedValue([]);

      const { result } = renderHook(() => useNextClass(), {
        wrapper: createWrapper(),
      });

      await waitFor(() => {
        expect(result.current.isError).toBe(false);
      });
    });
  });
});
