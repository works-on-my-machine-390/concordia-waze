import { CampusCode } from "@/hooks/queries/buildingQueries";
import { useGetShuttlePositions } from "@/hooks/queries/shuttleQueries";
import useMapSettings from "@/hooks/useMapSettings";
import { Marker } from "react-native-maps";

export default function ShuttleBusMarkers({ campus }: { campus?: CampusCode }) {
  const { mapSettings } = useMapSettings();

  const shuttleMarkerQuery = useGetShuttlePositions();

  const shuttlePositions = shuttleMarkerQuery.data;

  if (
    !mapSettings.showShuttleStops ||
    shuttleMarkerQuery.isLoading ||
    !shuttlePositions
  ) {
    return null;
  }

  return (
    <>
      {!campus ||
        (campus === CampusCode.LOY && (
          <Marker
            coordinate={{
              latitude: shuttlePositions?.LOY.lat,
              longitude: shuttlePositions?.LOY.lng,
            }}
            title="Shuttle Bus Stop - LOY"
            description="Loyola Campus Shuttle Stop"
          />
        ))}
      {!campus ||
        (campus === CampusCode.SGW && (
          <Marker
            coordinate={{
              latitude: shuttlePositions?.SGW.lat,
              longitude: shuttlePositions?.SGW.lng,
            }}
            title="Shuttle Bus Stop - SGW"
            description="SGW Campus Shuttle Stop"
          />
        ))}
    </>
  );
}
