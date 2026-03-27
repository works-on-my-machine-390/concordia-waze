import { COLORS } from "@/app/constants";
import { GetDirectionsIcon } from "@/app/icons";
import {
  RoomSearchResponseModel,
  useGetRoomLocation,
} from "@/hooks/queries/roomQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  IndoorNavigableLocation,
  NavigationPhase,
  OutdoorNavigableLocation,
  useNavigationStore,
} from "@/hooks/useNavigationStore";
import useStartLocation from "@/hooks/useStartLocation";
import { Pressable, View } from "react-native";
import { Toast } from "toastify-react-native";

export type DirectionsToRoomTargetModel = {
  buildingCode: string;
  roomCode: string;
};

export type DirectionsToRoomButtonProps = {
  target: DirectionsToRoomTargetModel;
  component?: React.ReactNode; // optional component to be rendered instead of the default button
};

/**
 * The point of this component is to be a button that when pressed, will attempt and fetch the information required
 * to start navigating to a room. As not all rooms are mapped, the component will contain the logic to fallback to the
 * building's coordinates instead.
 */
export default function DirectionsToRoomButton(
  props: Readonly<DirectionsToRoomButtonProps>,
) {
  const fullRoomCode =
    props.target.buildingCode && props.target.roomCode
      ? props.target.buildingCode + props.target.roomCode
      : "";

  const roomLocationQuery = useGetRoomLocation(fullRoomCode);

  const setMapMode = useMapStore((state) => state.setCurrentMode);
  const navigationState = useNavigationStore();
  const { findAndSetStartLocation } = useStartLocation();

  const buildEndLocationFromSafeSearchResult = (
    res: RoomSearchResponseModel,
  ) => {
    if (res.fallback_to_building) {
      return {
        latitude: res.building_latitude,
        longitude: res.building_longitude,
        code: res.building_code,
        name: res.label,
      } as OutdoorNavigableLocation;
    }

    return {
      latitude: res.building_latitude,
      longitude: res.building_longitude,
      code: res.building_code,
      building: res.building_code,
      name: res.label,
      floor_number: res.room.floor,
      indoor_position: {
        x: res.room.centroid.x,
        y: res.room.centroid.y,
      },
    } as IndoorNavigableLocation;
  };

  const handlePress = () => {
    if (!roomLocationQuery.data)
      Toast.warn(
        "Room location data is not available, please try again later.",
      );

    const endLocation = buildEndLocationFromSafeSearchResult(
      roomLocationQuery.data,
    );

    navigationState.setEndLocation(endLocation);
    findAndSetStartLocation(endLocation);
    setMapMode(MapMode.NAVIGATION);
    navigationState.setNavigationPhase(NavigationPhase.PREPARATION);
  };

  return (
    <Pressable onPress={handlePress}>
      {props.component ? (
        props.component
      ) : (
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 8,
            padding: 6,
          }}
        >
          <GetDirectionsIcon size={30} color={COLORS.conuRed} />
        </View>
      )}
    </Pressable>
  );
}
