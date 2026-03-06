export const formatIndoorPoiName = (
  poiName: string,
  poiType: string,
  buildingCode: string,
): string => {
  const isRoom = poiType?.toLowerCase() === "room";

  const isNumericRoom =
    /^Room\s*\d+/i.test(poiName) ||
    /^[\d.]+$/.test(poiName.trim()) ||
    /^S\d[\d.]*$/i.test(poiName.trim());

  const needsSpaceSeparator = isNumericRoom && /^S\d/i.test(poiName.trim());
  const separator = needsSpaceSeparator ? " " : "";

  if (isRoom && isNumericRoom) {
    return `${buildingCode}${separator}${poiName.replace(/^Room\s*/i, "").trim()}`;
  }

  if (isRoom) {
    return poiName;
  }

  if (/^poi_\d+$/i.test(poiName) && poiType.trim().length > 0) {
    return poiType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  return poiName;
};

export const extractFloorFromAddress = (address: string): number => {
  const match = /Floor\s+(-?\d+)/i.exec(address);
  return match ? Number.parseInt(match[1], 10) : 1;
};
