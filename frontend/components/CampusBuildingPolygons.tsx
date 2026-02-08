import { CampusBuilding } from "@/hooks/queries/buildingQueries";
import { Polygon } from "react-native-maps";
import { CAMPUS_BUILDING_STYLE } from "../app/styles/buildingPolygons/campusBuildingStyle";
import { CURRENT_BUILDING_STYLE } from "../app/styles/buildingPolygons/currentBuildingStyle";

export type CampusBuildingPolygonsProps = {
  highlightedCode?: string | null;
  buildings: CampusBuilding[];
  onBuildingPress?: (buildingCode: string) => void;
};

export default function CampusBuildingPolygons({
  highlightedCode = null,
  buildings,
  onBuildingPress,
}: Readonly<CampusBuildingPolygonsProps>) {


  const handlePolygonPress = (buildingCode: string) => {
    
    console.log(onBuildingPress, buildingCode);
    if (onBuildingPress) {
      onBuildingPress(buildingCode);
    }
  };
  return (
    <>
      {buildings.map((b: CampusBuilding) => {
        const isCurrent = b.code === highlightedCode;

        const style = isCurrent
          ? CURRENT_BUILDING_STYLE
          : CAMPUS_BUILDING_STYLE;

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
