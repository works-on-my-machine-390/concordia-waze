import React from "react";
import { Polygon } from "react-native-maps";

// keep your current working import style
import { CAMPUS_BUILDING_STYLE } from "../app/utils/campusBuildingStyle";
import { CURRENT_BUILDING_STYLE } from "../app/utils/currentBuildingStyle";
import { polygonToMapCoords } from "../app/utils/polygonMapper";
import { CAMPUS_BUILDINGS, type CampusBuilding } from "../app/utils/campusBuildings";

type Props = {
  campus?: "SGW" | "LOY";
  highlightedCode?: string | null; // building user is inside
};

export default function CampusBuildingPolygons({
  campus = "SGW",
  highlightedCode = null,
}: Props) {
  const list = CAMPUS_BUILDINGS[campus];

  return (
    <>
      {list.map((b: CampusBuilding) => {
        if (!b.shape || b.shape.type !== "Polygon") return null;

        const coords = polygonToMapCoords(b.shape.coordinates);
        const isCurrent = b.code === highlightedCode;

        const style = isCurrent
          ? CURRENT_BUILDING_STYLE
          : CAMPUS_BUILDING_STYLE;

        return (
          <Polygon
            key={b.code}
            coordinates={coords}
            fillColor={style.fillColor}
            strokeColor={style.strokeColor}
            strokeWidth={style.strokeWidth}
            zIndex={style.zIndex}
          />
        );
      })}
    </>
  );
}
