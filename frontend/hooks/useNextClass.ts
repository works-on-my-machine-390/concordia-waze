import { DAYS, toMinutes } from "@/app/utils/dateUtils";
import { useEffect, useState } from "react";
import { getGuestCourses } from "./guestStorage";
import { NextClassResponse, useGetNextClass } from "./queries/classQueries";
import { useGetProfile } from "./queries/userQueries";

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
  const { data: userProfile } = useGetProfile();
  const userId = userProfile?.userId || "";
  const isAuthenticated = !!userId;

  const { data, isLoading, isError } = useGetNextClass(isAuthenticated);

  const [guestNextClass, setGuestNextClass] =
    useState<NextClassResponse | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) return;

    setGuestLoading(true);
    findNextGuestClass()
      .then(setGuestNextClass)
      .finally(() => setGuestLoading(false));
  }, [isAuthenticated]);

  if (isAuthenticated) {
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
