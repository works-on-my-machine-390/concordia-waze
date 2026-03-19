import { SELECTED_BUILDING_STYLE } from "@/app/styles/buildingPolygons/selectedBuildingStyle";
import { CampusBuilding } from "@/hooks/queries/buildingQueries";
import useMapSettings from "@/hooks/useMapSettings";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import { ModifyingFieldOptions, useNavigationStore } from "@/hooks/useNavigationStore";
import useStartLocation from "@/hooks/useStartLocation";
import { Polygon } from "react-native-maps";
import { CAMPUS_BUILDING_STYLE } from "../app/styles/buildingPolygons/campusBuildingStyle";
import { CURRENT_BUILDING_STYLE } from "../app/styles/buildingPolygons/currentBuildingStyle";

export type CampusBuildingPolygonsProps = {
  buildings: CampusBuilding[];
};

export default function CampusBuildingPolygons({
  buildings,
}: Readonly<CampusBuildingPolygonsProps>) {
  const { mapSettings } = useMapSettings();

  const {
    currentBuildingCode,
    selectedBuildingCode,
    setSelectedBuildingCode,
    setCurrentMode,
  } = useMapStore();

  const navigationState = useNavigationStore();
  const { setStartLocationAutocomplete } = useStartLocation();

  const handlePolygonPress = (buildingCode: string) => {
    if (
      !navigationState.startLocation &&
      navigationState.modifyingField === ModifyingFieldOptions.start
    ) {
      setStartLocationAutocomplete(buildingCode);
      return; // don't change map mode if we're just setting the start location
    }

    setSelectedBuildingCode(buildingCode);
    setCurrentMode(MapMode.BUILDING);
  };

  if (!mapSettings.showBuildingPolygons) {
    return null;
  }

  return (
    <>
      {buildings.map((b: CampusBuilding) => {
        const isCurrent = b.code === currentBuildingCode;
        const isSelected = b.code === selectedBuildingCode;

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
            onPress={() => handlePolygonPress(b.code)}
          />
        );
      })}
    </>
  );
}
