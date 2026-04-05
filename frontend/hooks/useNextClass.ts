import { DAYS, toMinutes } from "@/app/utils/dateUtils";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getGuestCourses } from "./guestStorage";
import { NextClassResponse, useGetNextClass } from "./queries/classQueries";
import { useAuth } from "./useAuth";

const scheduleCallback = (
  endTime: string,
  callback: () => void,
): (() => void) => {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const msUntilEnd = (toMinutes(endTime) - nowMinutes) * 60 * 1000;
  if (msUntilEnd <= 0) return () => {};
  const timeout = setTimeout(callback, msUntilEnd);
  return () => clearTimeout(timeout);
};

const findNextGuestClass = async (): Promise<NextClassResponse | null> => {
  const courses = await getGuestCourses();
  const now = new Date();
  const todayName = DAYS[now.getDay()];
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const allClasses = courses.flatMap((course) =>
    course.classes
      .filter((cls) => cls.day === todayName)
      .map((cls) => ({ ...cls, className: course.name })),
  );

  const next = allClasses
    .filter((cls) => toMinutes(cls.endTime) > nowMinutes)
    .sort((a, b) => toMinutes(a.startTime) - toMinutes(b.startTime))[0];

  if (!next) return null;

  return {
    className: next.className,
    buildingLatitude: 0,
    buildingLongitude: 0,
    floorNumber: 0,
    roomX: 0,
    roomY: 0,
    item: {
      type: next.type,
      section: next.section,
      day: next.day,
      startTime: next.startTime,
      endTime: next.endTime,
      buildingCode: next.buildingCode,
      room: next.room,
      origin: next.origin,
    },
  };
};

export type UseNextClassResult = {
  nextClass: NextClassResponse | null;
  isLoading: boolean;
  isError: boolean;
};

export const useNextClass = (): UseNextClassResult => {
  const { checkToken } = useAuth();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // im putting null instead of false as default here because if it defaults to false, the hook might assume user is a guest before checkToken resolves
  // (even though they might be logged in) and guest storage will be called

  const queryClient = useQueryClient();

  useEffect(() => {
    checkToken().then(setIsAuthenticated);
  }, []);

  const { data, isLoading, isError } = useGetNextClass(
    isAuthenticated === true,
  );

  const [guestNextClass, setGuestNextClass] =
    useState<NextClassResponse | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated !== false) return;

    setGuestLoading(true);
    findNextGuestClass()
      .then(setGuestNextClass)
      .finally(() => setGuestLoading(false));
  }, [isAuthenticated]);

  // for authenticated users to fetch next class when the current class ends
  useEffect(() => {
    if (isAuthenticated !== true || !data?.item?.endTime) return;

    return scheduleCallback(data.item.endTime, () => {
      queryClient.invalidateQueries({ queryKey: ["nextClass"] });
    });
  }, [data?.item?.endTime, isAuthenticated]);

  // same as previous useeffect but for guest users
  useEffect(() => {
    if (isAuthenticated !== false || !guestNextClass?.item?.endTime) return;

    return scheduleCallback(guestNextClass.item.endTime, () => {
      findNextGuestClass().then(setGuestNextClass);
    });
  }, [guestNextClass?.item?.endTime, isAuthenticated]);

  if (isAuthenticated !== false) {
    return {
      nextClass: data ?? null,
      isLoading,
      isError,
    };
  }

  return {
    nextClass: guestNextClass,
    isLoading: guestLoading,
    isError: false,
  };
};
