import { SELECTED_BUILDING_STYLE } from "@/app/styles/buildingPolygons/selectedBuildingStyle";
import { CampusBuilding } from "@/hooks/queries/buildingQueries";
import { Polygon } from "react-native-maps";
import { CAMPUS_BUILDING_STYLE } from "../app/styles/buildingPolygons/campusBuildingStyle";
import { CURRENT_BUILDING_STYLE } from "../app/styles/buildingPolygons/currentBuildingStyle";
import useMapSettings from "@/hooks/useMapSettings";

export type CampusBuildingPolygonsProps = {
  highlightedCode?: string | null;
  selectedCode?: string | null;
  buildings: CampusBuilding[];
  onBuildingPress?: (buildingCode: string) => void;
};

export default function CampusBuildingPolygons({
  highlightedCode = null,
  selectedCode = null,
  buildings,
  onBuildingPress,
}: Readonly<CampusBuildingPolygonsProps>) {

  const {mapSettings} = useMapSettings();
  if (!mapSettings.showBuildingPolygons) {
    return null;
  }

  return (
    <>
      {buildings.map((b: CampusBuilding) => {
        const isCurrent = b.code === highlightedCode;
        const isSelected = b.code === selectedCode;

        let style = CAMPUS_BUILDING_STYLE;

        if (isCurrent) {
          style = CURRENT_BUILDING_STYLE;
        }
        if (isSelected) {
          style = SELECTED_BUILDING_STYLE;
        }
        return (
          <Polygon
            key={b.code}
            coordinates={b.polygon}
            fillColor={style.fillColor}
            strokeColor={style.strokeColor}
            strokeWidth={style.strokeWidth}
            zIndex={style.zIndex}
            tappable
            onPress={() => onBuildingPress?.(b.code)}
          />
        );
      })}
    </>
  );
}
