import { COLORS } from "@/app/constants";
import { GetDirectionsIcon } from "@/app/icons";
import { buildEndLocationFromSafeSearchResult } from "@/app/utils/mapUtils";
import { useGetRoomLocation } from "@/hooks/queries/roomQueries";
import { MapMode, useMapStore } from "@/hooks/useMapStore";
import {
  NavigationPhase,
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

  const handlePress = () => {
    if (!roomLocationQuery.data) {
      Toast.warn(
        "Room location data is not available, please try again later.",
      );
      return;
    }

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
