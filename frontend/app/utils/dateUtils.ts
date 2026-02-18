import type { OpeningHours } from "@/hooks/queries/buildingQueries";
import { COLORS } from "../constants";

export const daysOfWeek = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export const OpenStatusTypes = {
  OPEN: "Open now",
  OPEN_24H: "Open 24 hours",
  CLOSED: "Closed",
  CLOSING_SOON: "Closing soon",
  OPENING_SOON: "Opening soon",
} as const;
export type OpenStatusType =
  (typeof OpenStatusTypes)[keyof typeof OpenStatusTypes];

export const SOON_THRESHOLD_IN_MINUTES = 60;

export const getIsOpen247 = (openingHours: OpeningHours) => {
  if (
    openingHours["sunday"]?.open === "00:00" &&
    !openingHours["sunday"]?.close
  ) {
    return true;
  }
};

export const getOpenStatus = (openingHours: OpeningHours) => {
  // it's open 24 hours a day, every day of the week
  if (getIsOpen247(openingHours)) {
    return OpenStatusTypes.OPEN_24H;
  }

  const now = new Date();
  const currentDay = daysOfWeek[now.getDay()];
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // it's open 24 hours today specificallyF
  if (
    openingHours[currentDay]?.open === "00:00" &&
    !openingHours[currentDay]?.close
  ) {
    return OpenStatusTypes.OPEN_24H;
  }

  const todayHours = openingHours[currentDay as keyof typeof openingHours];

  if (!todayHours) return OpenStatusTypes.CLOSED;

  const [openHour, openMin] = todayHours.open.split(":").map(Number);
  const [closeHour, closeMin] = todayHours.close.split(":").map(Number);
  const openTime = openHour * 60 + openMin;
  const closeTime = closeHour * 60 + closeMin;

  if (currentTime >= openTime && currentTime < closeTime) {
    const timeUntilClose = closeTime - currentTime;
    return timeUntilClose <= SOON_THRESHOLD_IN_MINUTES
      ? OpenStatusTypes.CLOSING_SOON
      : OpenStatusTypes.OPEN;
  } else if (currentTime < openTime) {
    const timeUntilOpen = openTime - currentTime;
    return timeUntilOpen <= 60
      ? OpenStatusTypes.OPENING_SOON
      : OpenStatusTypes.CLOSED;
  }
  return OpenStatusTypes.CLOSED;
};

export const getOpenStatusColor = (status: OpenStatusType) => {
  switch (status) {
    case OpenStatusTypes.OPEN:
    case OpenStatusTypes.OPEN_24H:
      return COLORS.success;
    case OpenStatusTypes.CLOSED:
      return COLORS.error;
    case OpenStatusTypes.CLOSING_SOON:
    case OpenStatusTypes.OPENING_SOON:
      return COLORS.warning;
  }
};
