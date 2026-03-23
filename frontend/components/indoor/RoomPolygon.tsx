import type { Coordinate } from "@/hooks/queries/indoorMapQueries";
import { Polygon } from "react-native-svg";
import { ROOM_STYLE } from "@/app/styles/roomPolygons/roomStyle";
import { SELECTED_ROOM_STYLE } from "@/app/styles/roomPolygons/selectedRoomStyle";
import { useRef } from "react";
import type { GestureResponderEvent } from "react-native";

type Props = {
  polygon: Coordinate[];
  width: number;
  height: number;
  isSelected?: boolean;
  onPress: () => void;
};

export default function RoomPolygon({
  polygon,
  width,
  height,
  isSelected,
  onPress,
}: Readonly<Props>) {
  const touchStart = useRef<{ x: number; y: number; time: number } | null>(
    null,
  );

  if (polygon.length < 3) return null;

  const points = polygon
    .map((coord) => `${coord.x * width},${coord.y * height}`)
    .join(" ");

  const style = isSelected ? SELECTED_ROOM_STYLE : ROOM_STYLE;

  // Triggered on press in
  const handleResponderGrant = (e: GestureResponderEvent) => {
    touchStart.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
      time: Date.now(),
    };
  };

  // Triggered on press out
  const handleResponderRelease = (e: GestureResponderEvent) => {
    if (!touchStart.current) return;

    const dx = Math.abs(e.nativeEvent.pageX - touchStart.current.x);
    const dy = Math.abs(e.nativeEvent.pageY - touchStart.current.y);
    const duration = Date.now() - touchStart.current.time;

    // minimal movement and reasonable duration to be considered a tap
    if (dx < 15 && dy < 15 && duration < 500) {
      onPress();
    }

    touchStart.current = null;
  };

  // ReactNativeZoomableView forcefully steals the gesture to pan
  const handleResponderTerminate = () => {
    touchStart.current = null; // abort tap
  };

  return (
    <Polygon
      points={points}
      fill={style.fillColor}
      stroke={style.strokeColor}
      strokeWidth={style.strokeWidth}
      onStartShouldSetResponder={() => true}
      onResponderTerminationRequest={() => true}
      onResponderGrant={handleResponderGrant}
      onResponderRelease={handleResponderRelease}
      onResponderTerminate={handleResponderTerminate}
    />
  );
}
